import bcrypt from "bcrypt";
import { pool } from "../db/pool";
import { AppError } from "../middleware/errorHandler";
import { AuthUser, Role } from "../types/auth";

export async function login(
  email: string,
  password: string
): Promise<AuthUser> {
  const result = await pool.query(
    `
    SELECT id, email, password_hash
    FROM user_account
    WHERE LOWER(email) = LOWER($1)
      AND status = 'ACTIVE'
    `,
    [email]
  );

  if (result.rowCount !== 1) {
    throw new AppError(401, "Invalid email or password");
  }

  const account = result.rows[0];

  const valid = await bcrypt.compare(
    password,
    account.password_hash
  );

  if (!valid) {
    throw new AppError(401, "Invalid email or password");
  }

  // V1 keeps ADMIN/STAFF membership separate from teacher identity.
  const membership = await pool.query(
    `
    SELECT role
    FROM institution_membership
    WHERE user_account_id = $1
    ORDER BY CASE role
      WHEN 'ADMIN' THEN 1
      ELSE 2
    END
    LIMIT 1
    `,
    [account.id]
  );

  const teacher = await pool.query(
    `
    SELECT id
    FROM teacher
    WHERE user_account_id = $1
      AND status = 'ACTIVE'
    `,
    [account.id]
  );

  let role: Role;
  let teacherId: number | undefined;

  if (membership.rowCount === 1) {
    role = membership.rows[0].role as Role;
  } else if (teacher.rowCount === 1) {
    role = "TEACHER";
    teacherId = teacher.rows[0].id;
  } else {
    throw new AppError(
      403,
      "User has no active application role"
    );
  }

  return {
    userId: account.id,
    email: account.email,
    role,
    teacherId,
  };
}