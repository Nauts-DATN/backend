import type { Request, Response } from "express";
import type { SystemReportService } from "../../services/system-report.service.js";
import { sendFail, sendOk } from "../../utils/response.js";

export class SystemReportController {
  constructor(systemReportService: SystemReportService) {
    this.systemReportService = systemReportService;
  }

  private readonly systemReportService: SystemReportService;

  create = async (req: Request, res: Response): Promise<void> => {
    const { title, description } = req.body as {
      title?: string;
      description?: string;
    };

    if (!title?.trim()) {
      sendFail(res, 400, "Thiếu tiêu đề");
      return;
    }

    if (!description?.trim()) {
      sendFail(res, 400, "Thiếu mô tả lỗi");
      return;
    }

    const report = await this.systemReportService.create({
      title: title.trim(),
      description: description.trim(),
      reportedBy: req.auth!.userId,
    });

    sendOk(res, { report }, 201);
  };

  listMine = async (req: Request, res: Response): Promise<void> => {
    const reports = await this.systemReportService.listMine(req.auth!.userId);
    sendOk(res, { reports });
  };

  listAll = async (_req: Request, res: Response): Promise<void> => {
    const reports = await this.systemReportService.listAll();
    sendOk(res, { reports });
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    try {
      const report = await this.systemReportService.getById(
        req.params.id,
        req.auth!.userId,
        req.auth!.role,
      );
      sendOk(res, { report });
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 403 || err.status === 404) {
        sendFail(res, err.status, err.message);
        return;
      }
      throw e;
    }
  };

  markCompleted = async (req: Request, res: Response): Promise<void> => {
    try {
      const report = await this.systemReportService.markCompleted(req.params.id);
      sendOk(res, { report });
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
