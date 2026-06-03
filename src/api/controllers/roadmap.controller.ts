import type { Request, Response } from "express";
import type { RoadmapService } from "../../services/roadmap.service.js";
import type { RoadmapStatus } from "../../models/roadmap.model.js";
import { ROADMAP_STATUS } from "../../models/roadmap.model.js";
import { sendFail, sendOk } from "../../utils/response.js";

function handleErr(res: Response, e: unknown): void {
  const err = e as Error & { status?: number };
  if ([400, 403, 404, 409].includes(err.status ?? 0)) {
    sendFail(res, err.status!, err.message);
    return;
  }
  throw e;
}

function parseStatus(value: unknown): RoadmapStatus | undefined {
  if (typeof value !== "string") return undefined;
  return ROADMAP_STATUS.includes(value as RoadmapStatus)
    ? (value as RoadmapStatus)
    : undefined;
}

export class RoadmapController {
  constructor(roadmapService: RoadmapService) {
    this.roadmapService = roadmapService;
  }

  private readonly roadmapService: RoadmapService;

  createRoadmap = async (req: Request, res: Response): Promise<void> => {
    const { title, description } = req.body as {
      title?: string;
      description?: string;
    };
    if (!title?.trim()) {
      sendFail(res, 400, "Thiếu title");
      return;
    }
    const roadmap = await this.roadmapService.createRoadmap(
      {
        title: title.trim(),
        description: description?.trim(),
      },
      req.auth!.userId,
    );
    sendOk(res, { roadmap }, 201);
  };

  listRoadmaps = async (req: Request, res: Response): Promise<void> => {
    const roadmaps = await this.roadmapService.listRoadmaps(req.auth!.userId);
    sendOk(res, { roadmaps });
  };

  getRoadmapById = async (req: Request, res: Response): Promise<void> => {
    try {
      const roadmap = await this.roadmapService.getRoadmapById(
        req.params.id,
        req.auth!.userId,
        req.auth!.role,
      );
      sendOk(res, { roadmap });
    } catch (e) {
      handleErr(res, e);
    }
  };

  updateRoadmap = async (req: Request, res: Response): Promise<void> => {
    const { title, description, status } = req.body as {
      title?: string;
      description?: string;
      status?: string;
    };
    if (title !== undefined && !title.trim()) {
      sendFail(res, 400, "title không được để trống");
      return;
    }
    const parsedStatus = status === undefined ? undefined : parseStatus(status);
    if (status !== undefined && !parsedStatus) {
      sendFail(res, 400, "status không hợp lệ");
      return;
    }
    try {
      const roadmap = await this.roadmapService.updateRoadmap(
        req.params.id,
        {
          title: title?.trim(),
          description: description?.trim(),
          status: parsedStatus,
        },
        req.auth!.userId,
        req.auth!.role,
      );
      sendOk(res, { roadmap });
    } catch (e) {
      handleErr(res, e);
    }
  };

  deleteRoadmap = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.roadmapService.deleteRoadmap(
        req.params.id,
        req.auth!.userId,
        req.auth!.role,
      );
      sendOk(res, { message: "Đã xóa roadmap" });
    } catch (e) {
      handleErr(res, e);
    }
  };

  addTask = async (req: Request, res: Response): Promise<void> => {
    const { title, description, documentId } = req.body as {
      title?: string;
      description?: string;
      documentId?: string;
    };
    if (!title?.trim()) {
      sendFail(res, 400, "Thiếu title");
      return;
    }
    try {
      const result = await this.roadmapService.addTask(
        req.params.id,
        {
          title: title.trim(),
          description: description?.trim(),
          documentId: documentId?.trim() || undefined,
        },
        req.auth!.userId,
        req.auth!.role,
      );
      sendOk(res, result, 201);
    } catch (e) {
      handleErr(res, e);
    }
  };

  updateTask = async (req: Request, res: Response): Promise<void> => {
    const { title, description, documentId, isCompleted } = req.body as {
      title?: string;
      description?: string;
      documentId?: string | null;
      isCompleted?: boolean;
    };
    if (title !== undefined && !title.trim()) {
      sendFail(res, 400, "title không được để trống");
      return;
    }
    if (isCompleted !== undefined && typeof isCompleted !== "boolean") {
      sendFail(res, 400, "isCompleted phải là boolean");
      return;
    }
    try {
      const result = await this.roadmapService.updateTask(
        req.params.taskId,
        {
          title: title?.trim(),
          description: description?.trim(),
          documentId:
            documentId === null ? null : documentId?.trim() || undefined,
          isCompleted,
        },
        req.auth!.userId,
        req.auth!.role,
      );
      sendOk(res, result);
    } catch (e) {
      handleErr(res, e);
    }
  };

  deleteTask = async (req: Request, res: Response): Promise<void> => {
    try {
      const roadmap = await this.roadmapService.deleteTask(
        req.params.taskId,
        req.auth!.userId,
        req.auth!.role,
      );
      sendOk(res, { roadmap, message: "Đã xóa task" });
    } catch (e) {
      handleErr(res, e);
    }
  };

  completeTask = async (req: Request, res: Response): Promise<void> => {
    const { isCompleted } = req.body as { isCompleted?: boolean };
    if (typeof isCompleted !== "boolean") {
      sendFail(res, 400, "Thiếu hoặc sai isCompleted");
      return;
    }
    try {
      const result = await this.roadmapService.completeTask(
        req.params.taskId,
        isCompleted,
        req.auth!.userId,
        req.auth!.role,
      );
      sendOk(res, result);
    } catch (e) {
      handleErr(res, e);
    }
  };

  attachDocument = async (req: Request, res: Response): Promise<void> => {
    const { documentId } = req.body as { documentId?: string | null };
    if (documentId !== null && !documentId?.trim()) {
      sendFail(res, 400, "Thiếu documentId");
      return;
    }
    try {
      const result = await this.roadmapService.attachDocumentToTask(
        req.params.taskId,
        documentId === null ? null : documentId.trim(),
        req.auth!.userId,
        req.auth!.role,
      );
      sendOk(res, result);
    } catch (e) {
      handleErr(res, e);
    }
  };
}
