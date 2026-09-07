import { pool } from "../db/pool";
import { AppError } from "../middleware/errorHandler";
import { canAccessInstitution } from "../middleware/auth";
import { AuthUser } from "../types/auth";

async function authorizeEnrollment(
  user: AuthUser,
  enrollmentId: number
) {
  const result = await pool.query(
    `
    SELECT
      e.id,
      e.class_id,
      e.student_id,
      c.institution_id,
      c.teacher_id
    FROM enrollment e
    JOIN class c ON c.id = e.class_id
    WHERE e.id = $1
    `,
    [enrollmentId]
  );

  if (result.rowCount !== 1) {
    throw new AppError(
      404,
      "Enrollment not found"
    );
  }

  const row = result.rows[0];

  if (
    user.role === "TEACHER" &&
    row.teacher_id !== user.teacherId
  ) {
    throw new AppError(
      403,
      "You cannot access this enrollment"
    );
  }

  if (user.role !== "TEACHER") {
    const allowed =
      await canAccessInstitution(
        user,
        row.institution_id
      );

    if (!allowed) {
      throw new AppError(
        403,
        "You do not have access to this enrollment"
      );
    }
  }

  return row;
}

export async function recordPayment(
  user: AuthUser,
  input: {
    enrollmentId: number;
    billingMonth: string;
    amount: number;
  }
) {
  if (
    user.role !== "ADMIN" &&
    user.role !== "STAFF"
  ) {
    throw new AppError(
      403,
      "Only admin or staff can record payments"
    );
  }

  const enrollment =
    await authorizeEnrollment(
      user,
      input.enrollmentId
    );

  if (enrollment) {
    // authorization only
  }

  const result = await pool.query(
    `
    INSERT INTO payment (
      enrollment_id,
      billing_month,
      amount,
      status,
      paid_at,
      recorded_by
    )
    VALUES (
      $1,
      $2,
      $3,
      'PAID',
      CURRENT_TIMESTAMP,
      $4
    )
    ON CONFLICT (
      enrollment_id,
      billing_month
    )
    DO UPDATE SET
      amount = EXCLUDED.amount,
      status = 'PAID',
      paid_at = CURRENT_TIMESTAMP,
      recorded_by = EXCLUDED.recorded_by
    RETURNING
      id,
      enrollment_id AS "enrollmentId",
      billing_month AS "billingMonth",
      amount,
      status,
      paid_at AS "paidAt",
      recorded_by AS "recordedBy",
      created_at AS "createdAt"
    `,
    [
      input.enrollmentId,
      input.billingMonth,
      input.amount,
      user.userId,
    ]
  );

  return result.rows[0];
}

export async function listPayments(
  user: AuthUser,
  enrollmentId: number
) {
  await authorizeEnrollment(
    user,
    enrollmentId
  );

  const result = await pool.query(
    `
    SELECT
      id,
      enrollment_id AS "enrollmentId",
      billing_month AS "billingMonth",
      amount,
      status,
      paid_at AS "paidAt",
      recorded_by AS "recordedBy",
      created_at AS "createdAt"
    FROM payment
    WHERE enrollment_id = $1
    ORDER BY billing_month DESC
    `,
    [enrollmentId]
  );

  return result.rows;
}