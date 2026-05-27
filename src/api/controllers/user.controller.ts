import type { Request, Response } from "express";
import type { UserService } from "../../services/user.service.js";
import { sendOk, sendFail } from "../../utils/response.js";

function handleUserErr(res: Response, e: unknown): void {
  const err = e as Error & { status?: number };
  if ([400, 403, 404].includes(err.status ?? 0)) {
    sendFail(res, err.status!, err.message);
    return;
  }
  throw e;
}

export class UserController {
  constructor(userService: UserService) {
    this.userService = userService;
  }

  private readonly userService: UserService;

  list = async (req: Request, res: Response): Promise<void> => {
    const search =
      typeof req.query.search === "string" ? req.query.search : undefined;
    const users = await this.userService.listUsers(search);
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

  updateName = async (req: Request, res: Response): Promise<void> => {
    const { name, username } = req.body as {
      name?: string;
      username?: string;
    };
    const nextName = name ?? username;
    if (!nextName?.trim()) {
      sendFail(res, 400, "Thiếu name");
      return;
    }

    try {
      const user = await this.userService.updateName(req.auth!.userId, nextName);
      sendOk(res, { user });
    } catch (e) {
      const err = e as Error & { status?: number };
      if ([400, 404].includes(err.status ?? 0)) {
        sendFail(res, err.status!, err.message);
        return;
      }
      throw e;
    }
  };

  updatePassword = async (req: Request, res: Response): Promise<void> => {
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
    };

    try {
      await this.userService.updatePassword(
        req.auth!.userId,
        currentPassword ?? "",
        newPassword ?? "",
      );
      sendOk(res, { message: "Đã cập nhật mật khẩu" });
    } catch (e) {
      const err = e as Error & { status?: number };
      if ([400, 404].includes(err.status ?? 0)) {
        sendFail(res, err.status!, err.message);
        return;
      }
      throw e;
    }
  };

  updateAvatar = async (req: Request, res: Response): Promise<void> => {
    const file = req.file;
    if (!file?.buffer) {
      sendFail(res, 400, "Thiếu file (field: avatar)");
      return;
    }

    try {
      const result = await this.userService.uploadAvatar(
        req.auth!.userId,
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

  getAvatar = async (req: Request, res: Response): Promise<void> => {
    try {
      const avatar = await this.userService.getAvatar(req.params.id);
      res.setHeader("Content-Type", avatar.contentType);
      if (avatar.contentLength !== undefined) {
        res.setHeader("Content-Length", String(avatar.contentLength));
      }
      res.setHeader("Cache-Control", "public, max-age=3600");
      avatar.body.pipe(res);
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 404) {
        sendFail(res, 404, err.message);
        return;
      }
      throw e;
    }
  };

  setBlocked = async (req: Request, res: Response): Promise<void> => {
    const { isBlocked } = req.body as { isBlocked?: boolean };
    if (typeof isBlocked !== "boolean") {
      sendFail(res, 400, "isBlocked phải là boolean");
      return;
    }

    try {
      const user = await this.userService.setUserBlocked(
        req.params.id,
        isBlocked,
        req.auth!.userId,
      );
      sendOk(res, { user });
    } catch (e) {
      handleUserErr(res, e);
    }
  };

  deleteById = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.userService.deleteUser(req.params.id, req.auth!.userId);
      sendOk(res, { message: "Đã xóa user" });
    } catch (e) {
      handleUserErr(res, e);
    }
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
