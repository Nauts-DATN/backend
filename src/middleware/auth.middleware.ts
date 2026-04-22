import type { NextFunction, Request, Response } from "express";
import type { JwtService } from "../services/jwt.service.js";
import type { UserRole } from "../models/user.model.js";
import { sendFail } from "../utils/response.js";

export class AuthMiddleware {
  constructor(jwtService: JwtService) {
    this.jwtService = jwtService;
  }

  private readonly jwtService: JwtService;

  authenticate = (req: Request, res: Response, next: NextFunction): void => {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
    if (!token) {
      sendFail(res, 401, "Thiếu token");
      return;
    }
    try {
      const { sub, role } = this.jwtService.verify(token);
      req.auth = { userId: sub, role };
      next();
    } catch {
      sendFail(res, 401, "Token không hợp lệ hoặc hết hạn");
    }
  };

  requireRoles(...roles: UserRole[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.auth) {
        sendFail(res, 401, "Chưa đăng nhập");
        return;
      }
      if (!roles.includes(req.auth.role)) {
        sendFail(res, 403, "Không có quyền");
        return;
      }
      next();
    };
  }

  /** Chỉ user chính mình hoặc admin (param mặc định `id`). */
  requireSelfOrAdmin(paramName = "id") {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.auth) {
        sendFail(res, 401, "Chưa đăng nhập");
        return;
      }
      const targetId = req.params[paramName];
      if (req.auth.role === "admin" || req.auth.userId === targetId) {
        next();
        return;
      }
      sendFail(res, 403, "Không có quyền");
    };
  }
}
