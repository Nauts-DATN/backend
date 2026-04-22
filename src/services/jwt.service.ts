import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { USER_ROLES, type UserRole } from "../models/user.model.js";

export type JwtPayload = {
  sub: string;
  role: UserRole;
};

export class JwtService {
  sign(userId: string, role: UserRole): string {
    const payload: JwtPayload = { sub: userId, role };
    const options: jwt.SignOptions = {
      expiresIn: env.jwt.expiresIn as jwt.SignOptions["expiresIn"],
    };
    return jwt.sign(payload, env.jwt.secret, options);
  }

  verify(token: string): JwtPayload {
    const decoded = jwt.verify(token, env.jwt.secret) as jwt.JwtPayload & {
      sub?: string;
      role?: string;
    };
    if (!decoded.sub || !decoded.role) {
      throw new Error("Invalid token payload");
    }
    if (!USER_ROLES.includes(decoded.role as UserRole)) {
      throw new Error("Invalid token role");
    }
    return { sub: decoded.sub, role: decoded.role as UserRole };
  }
}
