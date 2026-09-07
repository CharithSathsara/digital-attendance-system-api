import { NextFunction, Request, Response } from "express";
import { pool } from "../db/pool";
import { AppError } from "./errorHandler";
import { AuthUser, Role } from "../types/auth";

export function getCurrentUser(req: Request): AuthUser {
  if (!req.session.user) {
    throw new AppError(401, "Authentication required");
  }

  return req.session.user;
}

export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    getCurrentUser(req);
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...roles: Role[]) {
  return (
    req: Request,
    _res: Response,
    next: NextFunction
  ) => {
    try {
      const user = getCurrentUser(req);

      if (!roles.includes(user.role)) {
        throw new AppError(
          403,
          "You do not have permission for this action"
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export async function canAccessInstitution(
  user: AuthUser,
  institutionId: number
): Promise<boolean> {
  if (user.role === "TEACHER") {
    if (!user.teacherId) return false;

    const result = await pool.query(
      `
      SELECT 1
      FROM teacher_institution
      WHERE teacher_id = $1
        AND institution_id = $2
      `,
      [user.teacherId, institutionId]
    );

    return result.rowCount === 1;
  }

  const result = await pool.query(
    `
    SELECT 1
    FROM institution_membership
    WHERE user_account_id = $1
      AND institution_id = $2
    `,
    [user.userId, institutionId]
  );

  return result.rowCount === 1;
}