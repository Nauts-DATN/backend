import type { NextFunction, Request, Response } from "express";
import type { JwtService } from "../services/jwt.service.js";
import type { UserRepository } from "../repositories/user.repository.js";
import type { UserRole } from "../models/user.model.js";
import { sendFail } from "../utils/response.js";

export class AuthMiddleware {
  constructor(jwtService: JwtService, userRepository: UserRepository) {
    this.jwtService = jwtService;
    this.userRepository = userRepository;
  }

  private readonly jwtService: JwtService;
  private readonly userRepository: UserRepository;

  authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
    if (!token) {
      sendFail(res, 401, "Thiếu token");
      return;
    }
    try {
      const { sub, role } = this.jwtService.verify(token);
      const user = await this.userRepository.findById(sub);
      if (!user) {
        sendFail(res, 401, "User không tồn tại");
        return;
      }
      if (user.isBlocked) {
        sendFail(res, 403, "Tài khoản đã bị khóa");
        return;
      }
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
