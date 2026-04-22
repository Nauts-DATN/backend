import type { Request, Response } from "express";
import type { DocumentService } from "../../services/document.service.js";
import { sendOk, sendFail } from "../../utils/response.js";

export class DocumentController {
  constructor(documentService: DocumentService) {
    this.documentService = documentService;
  }

  private readonly documentService: DocumentService;

  upload = async (req: Request, res: Response): Promise<void> => {
    const file = req.file;
    if (!file?.buffer) {
      sendFail(res, 400, "Thiếu file (field: file)");
      return;
    }
    const { title, description, category, course } = req.body as {
      title?: string;
      description?: string;
      category?: string;
      course?: string;
    };
    if (!title?.trim()) {
      sendFail(res, 400, "Thiếu title");
      return;
    }

    const doc = await this.documentService.upload({
      title: title.trim(),
      description: description?.trim(),
      category: category?.trim() || undefined,
      course: course?.trim() || undefined,
      uploadedBy: req.auth!.userId,
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype || "application/octet-stream",
    });

    sendOk(res, { document: doc }, 201);
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const docs = await this.documentService.list(
      req.auth!.userId,
      req.auth!.role,
    );
    sendOk(res, { documents: docs });
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    try {
      const doc = await this.documentService.getById(
        req.params.id,
        req.auth!.userId,
        req.auth!.role,
      );
      sendOk(res, { document: doc });
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 404 || err.status === 403) {
        sendFail(res, err.status, err.message);
        return;
      }
      throw e;
    }
  };

  presignedUrl = async (req: Request, res: Response): Promise<void> => {
    const expiresIn = Math.min(
      Math.max(Number(req.query.expiresIn) || 900, 60),
      3600,
    );
    try {
      const result = await this.documentService.getPresignedUrl(
        req.params.id,
        req.auth!.userId,
        req.auth!.role,
        expiresIn,
      );
      sendOk(res, result);
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 404 || err.status === 403) {
        sendFail(res, err.status, err.message);
        return;
      }
      throw e;
    }
  };

  download = async (req: Request, res: Response): Promise<void> => {
    try {
      const { stream, contentType, contentLength, fileName } =
        await this.documentService.getStream(
          req.params.id,
          req.auth!.userId,
          req.auth!.role,
        );
      res.setHeader("Content-Type", contentType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${encodeURIComponent(fileName)}"`,
      );
      if (contentLength !== undefined) {
        res.setHeader("Content-Length", contentLength);
      }
      stream.pipe(res);
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 404 || err.status === 403) {
        sendFail(res, err.status, err.message);
        return;
      }
      throw e;
    }
  };

  deleteById = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.documentService.deleteById(
        req.params.id,
        req.auth!.userId,
        req.auth!.role,
      );
      sendOk(res, { message: "Đã xóa document" });
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 404 || err.status === 403) {
        sendFail(res, err.status, err.message);
        return;
      }
      throw e;
    }
  };
}
