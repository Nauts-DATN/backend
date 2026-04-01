import type { Request, Response } from "express";
import type { UserService } from "../../services/user.service.js";

export class UserController {
  constructor(userService: UserService) {
    this.userService = userService;
  }

  private readonly userService: UserService;

  list = async (_req: Request, res: Response): Promise<void> => {
    const users = await this.userService.listUsers();
    res.json(users);
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const { email, name } = req.body as { email?: string; name?: string };
    if (!email || !name) {
      res.status(400).json({ message: "Thiếu email hoặc name" });
      return;
    }
    try {
      const user = await this.userService.createUser(email, name);
      res.status(201).json(user);
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 409) {
        res.status(409).json({ message: err.message });
        return;
      }
      throw e;
    }
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const user = await this.userService.getUserById(req.params.id);
    if (!user) {
      res.status(404).json({ message: "Không tìm thấy user" });
      return;
    }
    res.json(user);
  };

  uploadAvatar = async (req: Request, res: Response): Promise<void> => {
    const file = req.file;
    if (!file?.buffer) {
      res.status(400).json({ message: "Thiếu file (field: file)" });
      return;
    }
    try {
      const result = await this.userService.uploadAvatar(
        req.params.id,
        file.buffer,
        file.mimetype || "application/octet-stream",
      );
      res.json(result);
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 404) {
        res.status(404).json({ message: err.message });
        return;
      }
      throw e;
    }
  };
}
