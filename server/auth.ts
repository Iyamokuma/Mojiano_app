import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: "CUSTOMER" | "ADMIN";
};

const SECRET = process.env.AUTH_SECRET ?? "dev-only-change-me";
export const CUSTOMER_COOKIE = "mojiano_token";
export const STAFF_COOKIE = "mojiano_staff";

export function signUser(user: AuthUser) {
  return jwt.sign(user, SECRET, { expiresIn: "14d" });
}

function readCookie(req: Request, name: string): AuthUser | null {
  const token = req.cookies?.[name] as string | undefined;
  if (!token) return null;
  try {
    return jwt.verify(token, SECRET) as AuthUser;
  } catch {
    return null;
  }
}

export function readUser(req: Request): AuthUser | null {
  const user = readCookie(req, CUSTOMER_COOKIE);
  if (!user || user.role !== "CUSTOMER") return null;
  return user;
}

export function readStaff(req: Request): AuthUser | null {
  const user = readCookie(req, STAFF_COOKIE);
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

export function requireUser(req: Request, res: Response, next: NextFunction) {
  const user = readUser(req);
  if (!user) {
    res.status(401).json({ error: "Please sign in." });
    return;
  }
  req.user = user;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const staff = readStaff(req);
  if (!staff) {
    res.status(401).json({ error: "Staff sign-in required." });
    return;
  }
  req.user = staff;
  next();
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
