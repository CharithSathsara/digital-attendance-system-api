import crypto from "crypto";
import { pool, withTransaction } from "../db/pool";
import { AppError } from "../middleware/errorHandler";
import { AuthUser } from "../types/auth";
import { canAccessInstitution } from "../middleware/auth";

async function studentInstitutions(studentId: number) {
  const result = await pool.query(
    `
    SELECT DISTINCT
      c.institution_id,
      c.teacher_id
    FROM enrollment e
    JOIN class c ON c.id = e.class_id
    WHERE e.student_id = $1
      AND e.status = 'ACTIVE'
    `,
    [studentId]
  );

  return result.rows;
}

export async function authorizeStudent(
  user: AuthUser,
  studentId: number
) {
  const student = await pool.query(
    `
    SELECT
      id,
      student_number AS "studentNumber",
      name,
      phone,
      email,
      status
    FROM student
    WHERE id = $1
    `,
    [studentId]
  );

  if (student.rowCount !== 1) {
    throw new AppError(
      404,
      "Student not found"
    );
  }

  const institutions =
    await studentInstitutions(studentId);

  if (user.role === "TEACHER") {
    const allowed = institutions.some(
      (row) =>
        row.teacher_id === user.teacherId
    );

    if (!allowed) {
      throw new AppError(
        403,
        "You cannot access this student"
      );
    }
  } else {
    let allowed = false;

    for (const row of institutions) {
      if (
        await canAccessInstitution(
          user,
          row.institution_id
        )
      ) {
        allowed = true;
        break;
      }
    }

    if (!allowed) {
      throw new AppError(
        403,
        "You do not have access to this student"
      );
    }
  }

  return student.rows[0];
}

export async function listStudents(
  user: AuthUser
) {
  if (user.role === "TEACHER") {
    const result = await pool.query(
      `
      SELECT DISTINCT
        s.id,
        s.student_number AS "studentNumber",
        s.name,
        s.phone,
        s.email,
        s.status
      FROM student s
      JOIN enrollment e
        ON e.student_id = s.id
       AND e.status = 'ACTIVE'
      JOIN class c
        ON c.id = e.class_id
      WHERE c.teacher_id = $1
      ORDER BY s.name
      `,
      [user.teacherId]
    );

    return result.rows;
  }

  const result = await pool.query(
    `
    SELECT DISTINCT
      s.id,
      s.student_number AS "studentNumber",
      s.name,
      s.phone,
      s.email,
      s.status
    FROM student s
    JOIN enrollment e
      ON e.student_id = s.id
     AND e.status = 'ACTIVE'
    JOIN class c
      ON c.id = e.class_id
    JOIN institution_membership im
      ON im.institution_id = c.institution_id
     AND im.user_account_id = $1
    ORDER BY s.name
    `,
    [user.userId]
  );

  return result.rows;
}

export async function getStudent(
  user: AuthUser,
  studentId: number
) {
  return authorizeStudent(
    user,
    studentId
  );
}

export async function issueQr(
  user: AuthUser,
  studentId: number
) {
  await authorizeStudent(
    user,
    studentId
  );

  return withTransaction(async (client) => {
    await client.query(
      `
      UPDATE student_qr_credential
      SET
        status = 'REVOKED',
        revoked_at = CURRENT_TIMESTAMP
      WHERE student_id = $1
        AND status = 'ACTIVE'
      `,
      [studentId]
    );

    const rawToken =
      crypto.randomBytes(32).toString("base64url");

    const tokenHash =
      crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");

    const result = await client.query(
      `
      INSERT INTO student_qr_credential (
        student_id,
        token_hash
      )
      VALUES ($1, $2)
      RETURNING
        id,
        created_at AS "createdAt",
        status
      `,
      [
        studentId,
        tokenHash,
      ]
    );

    return {
      ...result.rows[0],
      qrToken: rawToken,
    };
  });
}