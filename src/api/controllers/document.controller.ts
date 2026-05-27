import type { Request, Response } from "express";
import type { DocumentService } from "../../services/document.service.js";
import { sendOk, sendFail } from "../../utils/response.js";

function readOptionalQuery(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

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
    const { title, description, category, course, isPublic } = req.body as {
      title?: string;
      description?: string;
      category?: string;
      course?: string;
      isPublic?: boolean | string;
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
      isPublic:
        typeof isPublic === "string"
          ? isPublic === "true"
          : Boolean(isPublic),
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
      // req.auth!.role,
      {
        search: readOptionalQuery(req.query.search),
        category: readOptionalQuery(req.query.category ?? req.query.categoryId),
        course: readOptionalQuery(req.query.course ?? req.query.courseId),
      },
    );
    sendOk(res, { documents: docs });
  };

  /** GET /documents/community?search=... */
  listCommunity = async (req: Request, res: Response): Promise<void> => {
    const docs = await this.documentService.listCommunity({
      search: readOptionalQuery(req.query.search),
      category: readOptionalQuery(req.query.category ?? req.query.categoryId),
      course: readOptionalQuery(req.query.course ?? req.query.courseId),
    });
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

  /** PATCH /documents/:id/visibility */
  setVisibility = async (req: Request, res: Response): Promise<void> => {
    const { isPublic } = req.body as { isPublic?: boolean };
    if (typeof isPublic !== "boolean") {
      sendFail(res, 400, "Thiếu hoặc sai isPublic (boolean)");
      return;
    }
    try {
      const doc = await this.documentService.setVisibility(
        req.params.id,
        isPublic,
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
}
