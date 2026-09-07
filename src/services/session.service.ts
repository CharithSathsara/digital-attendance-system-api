import crypto from "crypto";
import { pool, withTransaction } from "../db/pool";
import { AppError } from "../middleware/errorHandler";
import { canAccessInstitution } from "../middleware/auth";
import { AuthUser } from "../types/auth";
import { authorizeClass } from "./class.service";

async function authorizeSession(
  user: AuthUser,
  sessionId: number
) {
  const result = await pool.query(
    `
    SELECT
      cs.id,
      cs.status,
      cs.class_id,
      cs.session_date,
      cs.start_time,
      cs.end_time,
      c.institution_id,
      c.teacher_id,
      c.name AS class_name
    FROM class_session cs
    JOIN class c ON c.id = cs.class_id
    WHERE cs.id = $1
    `,
    [sessionId]
  );

  if (result.rowCount !== 1) {
    throw new AppError(
      404,
      "Class session not found"
    );
  }

  const session = result.rows[0];

  if (user.role === "TEACHER") {
    if (session.teacher_id !== user.teacherId) {
      throw new AppError(
        403,
        "You cannot access this class session"
      );
    }
  } else {
    const allowed = await canAccessInstitution(
      user,
      session.institution_id
    );

    if (!allowed) {
      throw new AppError(
        403,
        "You do not have access to this institution"
      );
    }
  }

  return session;
}

export async function createSession(
  user: AuthUser,
  classId: number,
  input: {
    sessionDate: string;
    startTime: string;
    endTime?: string;
  }
) {
  await authorizeClass(user, classId);

  const result = await pool.query(
    `
    INSERT INTO class_session (
      class_id,
      session_date,
      start_time,
      end_time
    )
    VALUES ($1, $2, $3, $4)
    RETURNING
      id,
      class_id AS "classId",
      session_date AS "sessionDate",
      start_time AS "startTime",
      end_time AS "endTime",
      status
    `,
    [
      classId,
      input.sessionDate,
      input.startTime,
      input.endTime ?? null,
    ]
  );

  return result.rows[0];
}

export async function listSessions(
  user: AuthUser,
  classId: number
) {
  await authorizeClass(user, classId);

  const result = await pool.query(
    `
    SELECT
      id,
      class_id AS "classId",
      session_date AS "sessionDate",
      start_time AS "startTime",
      end_time AS "endTime",
      status
    FROM class_session
    WHERE class_id = $1
    ORDER BY session_date DESC, start_time DESC
    `,
    [classId]
  );

  return result.rows;
}

export async function changeStatus(
  user: AuthUser,
  sessionId: number,
  status: "OPEN" | "CLOSED"
) {
  const session = await authorizeSession(
    user,
    sessionId
  );

  if (
    status === "OPEN" &&
    session.status === "CLOSED"
  ) {
    throw new AppError(
      400,
      "A closed session cannot be reopened"
    );
  }

  if (
    status === "CLOSED" &&
    session.status !== "OPEN"
  ) {
    throw new AppError(
      400,
      "Only an open session can be closed"
    );
  }

  const result = await pool.query(
    `
    UPDATE class_session
    SET status = $1
    WHERE id = $2
    RETURNING id, status
    `,
    [status, sessionId]
  );

  return result.rows[0];
}

export async function recordAttendance(
  user: AuthUser,
  sessionId: number,
  qrToken: string
) {
  return withTransaction(async (client) => {
    const sessionResult = await client.query(
      `
      SELECT
        cs.id,
        cs.status,
        cs.class_id,
        c.institution_id,
        c.teacher_id
      FROM class_session cs
      JOIN class c ON c.id = cs.class_id
      WHERE cs.id = $1
      FOR UPDATE
      `,
      [sessionId]
    );

    if (sessionResult.rowCount !== 1) {
      throw new AppError(
        404,
        "Class session not found"
      );
    }

    const session = sessionResult.rows[0];

    if (
      user.role === "TEACHER" &&
      session.teacher_id !== user.teacherId
    ) {
      throw new AppError(
        403,
        "You cannot record attendance for this session"
      );
    }

    if (user.role !== "TEACHER") {
      const membership = await client.query(
        `
        SELECT 1
        FROM institution_membership
        WHERE user_account_id = $1
          AND institution_id = $2
        `,
        [
          user.userId,
          session.institution_id,
        ]
      );

      if (membership.rowCount !== 1) {
        throw new AppError(
          403,
          "You do not have access to this institution"
        );
      }
    }

    if (session.status !== "OPEN") {
      throw new AppError(
        400,
        "Class session is not open"
      );
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(qrToken)
      .digest("hex");

    const qr = await client.query(
      `
      SELECT student_id
      FROM student_qr_credential
      WHERE token_hash = $1
        AND status = 'ACTIVE'
        AND revoked_at IS NULL
      `,
      [tokenHash]
    );

    if (qr.rowCount !== 1) {
      throw new AppError(
        400,
        "Invalid or revoked QR code"
      );
    }

    const studentId = qr.rows[0].student_id;

    const enrollment = await client.query(
      `
      SELECT id
      FROM enrollment
      WHERE student_id = $1
        AND class_id = $2
        AND status = 'ACTIVE'
      `,
      [
        studentId,
        session.class_id,
      ]
    );

    if (enrollment.rowCount !== 1) {
      throw new AppError(
        400,
        "Student is not actively enrolled in this class"
      );
    }

    try {
      const attendance = await client.query(
        `
        INSERT INTO attendance (
          enrollment_id,
          class_session_id
        )
        VALUES ($1, $2)
        RETURNING
          id,
          enrollment_id AS "enrollmentId",
          class_session_id AS "classSessionId",
          scanned_at AS "scannedAt"
        `,
        [
          enrollment.rows[0].id,
          sessionId,
        ]
      );

      return attendance.rows[0];
    } catch (error: any) {
      if (error?.code === "23505") {
        throw new AppError(
          409,
          "Attendance already recorded"
        );
      }

      throw error;
    }
  });
}