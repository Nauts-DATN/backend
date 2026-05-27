import type { Request, Response } from "express";
import type { CourseService } from "../../services/course.service.js";
import { sendOk, sendFail } from "../../utils/response.js";

function handleErr(res: Response, e: unknown): void {
  const err = e as Error & { status?: number };
  if ([400, 403, 404, 409].includes(err.status ?? 0)) {
    sendFail(res, err.status!, err.message);
    return;
  }
  throw e;
}

function readBody(req: Request): { name?: string; description?: string } {
  return req.body as { name?: string; description?: string };
}

export class CourseController {
  constructor(courseService: CourseService) {
    this.courseService = courseService;
  }

  private readonly courseService: CourseService;

  list = async (req: Request, res: Response): Promise<void> => {
    const courses = await this.courseService.list(req.auth!.userId);
    sendOk(res, { courses });
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    try {
      const course = await this.courseService.getById(
        req.params.id,
        req.auth!.userId,
      );
      sendOk(res, { course });
    } catch (e) {
      handleErr(res, e);
    }
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const { name, description } = readBody(req);
    if (!name?.trim()) {
      sendFail(res, 400, "Thiếu name");
      return;
    }
    try {
      const course = await this.courseService.create(
        {
          name: name.trim(),
          description: description?.trim(),
        },
        req.auth!.userId,
      );
      sendOk(res, { course }, 201);
    } catch (e) {
      handleErr(res, e);
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const { name, description } = readBody(req);
    try {
      const course = await this.courseService.update(
        req.params.id,
        {
          name: name?.trim(),
          description: description?.trim(),
        },
        req.auth!.userId,
      );
      sendOk(res, { course });
    } catch (e) {
      handleErr(res, e);
    }
  };

  deleteById = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.courseService.deleteById(req.params.id, req.auth!.userId);
      sendOk(res, { message: "Đã xóa course" });
    } catch (e) {
      handleErr(res, e);
    }
  };
}
