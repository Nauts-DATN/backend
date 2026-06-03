import type { Request, Response } from "express";
import type { CategoryService } from "../../services/category.service.js";
import { sendOk, sendFail } from "../../utils/response.js";

export class CategoryController {
  constructor(categoryService: CategoryService) {
    this.categoryService = categoryService;
  }

  private readonly categoryService: CategoryService;

  list = async (_req: Request, res: Response): Promise<void> => {
    const categories = await this.categoryService.list();
    sendOk(res, { categories });
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    try {
      const category = await this.categoryService.getById(req.params.id);
      sendOk(res, { category });
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 404) { sendFail(res, 404, err.message); return; }
      throw e;
    }
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const { name, description } = req.body as { name?: string; description?: string };
    if (!name?.trim()) { sendFail(res, 400, "Thiếu name"); return; }
    try {
      const category = await this.categoryService.create({
        name: name.trim(),
        description: description?.trim(),
      });
      sendOk(res, { category }, 201);
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 409) { sendFail(res, 409, err.message); return; }
      throw e;
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const { name, description } = req.body as { name?: string; description?: string };
    try {
      const category = await this.categoryService.update(req.params.id, {
        name: name?.trim(),
        description: description?.trim(),
      });
      sendOk(res, { category });
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 404 || err.status === 409) { sendFail(res, err.status, err.message); return; }
      throw e;
    }
  };

  deleteById = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.categoryService.deleteById(req.params.id);
      sendOk(res, { message: "Đã xóa category" });
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 404) { sendFail(res, 404, err.message); return; }
      throw e;
    }
  };
}
