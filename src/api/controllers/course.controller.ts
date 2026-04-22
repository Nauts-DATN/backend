import type { Request, Response } from "express";
import type { CourseService } from "../../services/course.service.js";
import { sendOk, sendFail } from "../../utils/response.js";

export class CourseController {
  constructor(courseService: CourseService) {
    this.courseService = courseService;
  }

  private readonly courseService: CourseService;

  list = async (_req: Request, res: Response): Promise<void> => {
    const courses = await this.courseService.list();
    sendOk(res, { courses });
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    try {
      const course = await this.courseService.getById(req.params.id);
      sendOk(res, { course });
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
      const course = await this.courseService.create({
        name: name.trim(),
        description: description?.trim(),
      });
      sendOk(res, { course }, 201);
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 409) { sendFail(res, 409, err.message); return; }
      throw e;
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const { name, description } = req.body as { name?: string; description?: string };
    try {
      const course = await this.courseService.update(req.params.id, {
        name: name?.trim(),
        description: description?.trim(),
      });
      sendOk(res, { course });
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 404 || err.status === 409) { sendFail(res, err.status, err.message); return; }
      throw e;
    }
  };

  deleteById = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.courseService.deleteById(req.params.id);
      sendOk(res, { message: "Đã xóa course" });
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 404) { sendFail(res, 404, err.message); return; }
      throw e;
    }
  };
}
