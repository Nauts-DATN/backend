import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { USER_ROLES, type UserRole } from "../models/user.model.js";

export type JwtPayload = {
  sub: string;
  role: UserRole;
};

export type RefreshJwtPayload = JwtPayload & {
  type: "refresh";
};

export class JwtService {
  sign(userId: string, role: UserRole): string {
    const payload: JwtPayload = { sub: userId, role };
    const options: jwt.SignOptions = {
      expiresIn: env.jwt.expiresIn as jwt.SignOptions["expiresIn"],
    };
    return jwt.sign(payload, env.jwt.secret, options);
  }

  signRefresh(userId: string, role: UserRole): string {
    const payload: RefreshJwtPayload = { sub: userId, role, type: "refresh" };
    const options: jwt.SignOptions = {
      expiresIn: env.jwt.refreshExpiresIn as jwt.SignOptions["expiresIn"],
    };
    return jwt.sign(payload, env.jwt.refreshSecret, options);
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

  verifyRefresh(token: string): RefreshJwtPayload {
    const decoded = jwt.verify(token, env.jwt.refreshSecret) as jwt.JwtPayload & {
      sub?: string;
      role?: string;
      type?: string;
    };
    if (!decoded.sub || !decoded.role || decoded.type !== "refresh") {
      throw new Error("Invalid refresh token payload");
    }
    if (!USER_ROLES.includes(decoded.role as UserRole)) {
      throw new Error("Invalid refresh token role");
    }
    return {
      sub: decoded.sub,
      role: decoded.role as UserRole,
      type: "refresh",
    };
  }
}
