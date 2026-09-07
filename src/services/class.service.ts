import { pool } from "../db/pool";
import { AppError } from "../middleware/errorHandler";
import { canAccessInstitution } from "../middleware/auth";
import { AuthUser } from "../types/auth";

async function getClassRow(classId: number) {
  const result = await pool.query(
    `
    SELECT
      c.id,
      c.institution_id,
      c.teacher_id,
      c.name,
      c.fee,
      c.status,
      i.name AS institution_name,
      t.name AS teacher_name
    FROM class c
    JOIN institution i ON i.id = c.institution_id
    JOIN teacher t ON t.id = c.teacher_id
    WHERE c.id = $1
    `,
    [classId]
  );

  if (result.rowCount !== 1) {
    throw new AppError(404, "Class not found");
  }

  return result.rows[0];
}

export async function authorizeClass(
  user: AuthUser,
  classId: number
) {
  const classRow = await getClassRow(classId);

  if (user.role === "TEACHER") {
    if (classRow.teacher_id !== user.teacherId) {
      throw new AppError(
        403,
        "You cannot access this class"
      );
    }
  } else {
    const allowed = await canAccessInstitution(
      user,
      classRow.institution_id
    );

    if (!allowed) {
      throw new AppError(
        403,
        "You do not have access to this institution"
      );
    }
  }

  return classRow;
}

export async function listClasses(user: AuthUser) {
  if (user.role === "TEACHER") {
    const result = await pool.query(
      `
      SELECT
        c.id,
        c.name,
        c.fee,
        c.status,
        c.institution_id AS "institutionId",
        i.name AS "institutionName",
        c.teacher_id AS "teacherId",
        t.name AS "teacherName"
      FROM class c
      JOIN institution i ON i.id = c.institution_id
      JOIN teacher t ON t.id = c.teacher_id
      WHERE c.teacher_id = $1
      ORDER BY i.name, c.name
      `,
      [user.teacherId]
    );

    return result.rows;
  }

  const result = await pool.query(
    `
    SELECT
      c.id,
      c.name,
      c.fee,
      c.status,
      c.institution_id AS "institutionId",
      i.name AS "institutionName",
      c.teacher_id AS "teacherId",
      t.name AS "teacherName"
    FROM class c
    JOIN institution i ON i.id = c.institution_id
    JOIN teacher t ON t.id = c.teacher_id
    JOIN institution_membership im
      ON im.institution_id = c.institution_id
     AND im.user_account_id = $1
    ORDER BY i.name, c.name
    `,
    [user.userId]
  );

  return result.rows;
}

export async function getClass(
  user: AuthUser,
  classId: number
) {
  return authorizeClass(user, classId);
}

export async function createClass(
  user: AuthUser,
  input: {
    institutionId: number;
    teacherId: number;
    name: string;
    fee: number;
  }
) {
  if (user.role !== "ADMIN") {
    throw new AppError(
      403,
      "Only admins can create classes"
    );
  }

  const allowed = await canAccessInstitution(
    user,
    input.institutionId
  );

  if (!allowed) {
    throw new AppError(
      403,
      "You do not manage this institution"
    );
  }

  const teacher = await pool.query(
    `
    SELECT 1
    FROM teacher_institution
    WHERE teacher_id = $1
      AND institution_id = $2
    `,
    [input.teacherId, input.institutionId]
  );

  if (teacher.rowCount !== 1) {
    throw new AppError(
      400,
      "Teacher is not linked to this institution"
    );
  }

  const result = await pool.query(
    `
    INSERT INTO class (
      institution_id,
      teacher_id,
      name,
      fee
    )
    VALUES ($1, $2, $3, $4)
    RETURNING
      id,
      institution_id AS "institutionId",
      teacher_id AS "teacherId",
      name,
      fee,
      status
    `,
    [
      input.institutionId,
      input.teacherId,
      input.name,
      input.fee,
    ]
  );

  return result.rows[0];
}

export async function listStudents(
  user: AuthUser,
  classId: number
) {
  await authorizeClass(user, classId);

  const result = await pool.query(
    `
    SELECT
      s.id,
      s.student_number AS "studentNumber",
      s.name,
      s.phone,
      s.email,
      e.id AS "enrollmentId",
      e.status AS "enrollmentStatus"
    FROM enrollment e
    JOIN student s ON s.id = e.student_id
    WHERE e.class_id = $1
    ORDER BY s.name
    `,
    [classId]
  );

  return result.rows;
}

export async function enrollStudent(
  user: AuthUser,
  classId: number,
  studentId: number
) {
  await authorizeClass(user, classId);

  const student = await pool.query(
    `
    SELECT id
    FROM student
    WHERE id = $1
      AND status = 'ACTIVE'
    `,
    [studentId]
  );

  if (student.rowCount !== 1) {
    throw new AppError(404, "Student not found");
  }

  const result = await pool.query(
    `
    INSERT INTO enrollment (
      student_id,
      class_id
    )
    VALUES ($1, $2)
    ON CONFLICT (student_id, class_id)
    DO UPDATE SET status = 'ACTIVE'
    RETURNING
      id,
      student_id AS "studentId",
      class_id AS "classId",
      status,
      enrolled_at AS "enrolledAt"
    `,
    [studentId, classId]
  );

  return result.rows[0];
}