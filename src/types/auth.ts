export type Role = "ADMIN" | "STAFF" | "TEACHER";

export interface AuthUser {
  userId: number;
  email: string;
  role: Role;
  teacherId?: number;
}

declare module "express-session" {
  interface SessionData {
    user?: AuthUser;
  }
}