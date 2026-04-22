import type { Request, Response } from "express";
import type { UserService } from "../../services/user.service.js";
import { sendOk, sendFail } from "../../utils/response.js";

export class UserController {
  constructor(userService: UserService) {
    this.userService = userService;
  }

  private readonly userService: UserService;

  list = async (_req: Request, res: Response): Promise<void> => {
    const users = await this.userService.listUsers();
    sendOk(res, users);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const user = await this.userService.getUserById(req.params.id);
    if (!user) {
      sendFail(res, 404, "Không tìm thấy user");
      return;
    }
    sendOk(res, user);
  };

  uploadAvatar = async (req: Request, res: Response): Promise<void> => {
    const file = req.file;
    if (!file?.buffer) {
      sendFail(res, 400, "Thiếu file (field: file)");
      return;
    }
    try {
      const result = await this.userService.uploadAvatar(
        req.params.id,
        file.buffer,
        file.mimetype || "application/octet-stream",
      );
      sendOk(res, result);
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 404) {
        sendFail(res, 404, err.message);
        return;
      }
      throw e;
    }
  };
}
