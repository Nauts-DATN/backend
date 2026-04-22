import type { Request, Response } from "express";
import type { NoteService } from "../../services/note.service.js";
import { sendOk, sendFail } from "../../utils/response.js";

function handleErr(res: Response, e: unknown): void {
  const err = e as Error & { status?: number };
  if (err.status === 404 || err.status === 403 || err.status === 409) {
    sendFail(res, err.status, err.message);
    return;
  }
  throw e;
}

export class NoteController {
  constructor(noteService: NoteService) {
    this.noteService = noteService;
  }

  private readonly noteService: NoteService;

  /** POST /notes — tạo ghi chú cho document */
  create = async (req: Request, res: Response): Promise<void> => {
    const { title, content, documentId } = req.body as {
      title?: string;
      content?: string;
      documentId?: string;
    };
    if (!title?.trim()) { sendFail(res, 400, "Thiếu title"); return; }
    if (!documentId?.trim()) { sendFail(res, 400, "Thiếu documentId"); return; }

    try {
      const note = await this.noteService.create(
        { title: title.trim(), content, documentId: documentId.trim() },
        req.auth!.userId,
        req.auth!.role,
      );
      sendOk(res, { note }, 201);
    } catch (e) { handleErr(res, e); }
  };

  /** GET /notes — danh sách ghi chú của người dùng */
  list = async (req: Request, res: Response): Promise<void> => {
    const notes = await this.noteService.listByUser(req.auth!.userId);
    sendOk(res, { notes });
  };

  /** GET /notes/:id */
  getById = async (req: Request, res: Response): Promise<void> => {
    try {
      const note = await this.noteService.getById(
        req.params.id,
        req.auth!.userId,
        req.auth!.role,
      );
      sendOk(res, { note });
    } catch (e) { handleErr(res, e); }
  };

  /** GET /documents/:id/note — danh sách ghi chú của 1 document */
  getByDocument = async (req: Request, res: Response): Promise<void> => {
    try {
      const notes = await this.noteService.listByDocument(
        req.params.id,
        req.auth!.userId,
        req.auth!.role,
      );
      sendOk(res, { notes });
    } catch (e) { handleErr(res, e); }
  };

  /** PUT /notes/:id */
  update = async (req: Request, res: Response): Promise<void> => {
    const { title, content } = req.body as {
      title?: string;
      content?: string;
    };
    if (title !== undefined && !title.trim()) {
      sendFail(res, 400, "title không được để trống");
      return;
    }

    try {
      const note = await this.noteService.update(
        req.params.id,
        { title: title?.trim(), content },
        req.auth!.userId,
        req.auth!.role,
      );
      sendOk(res, { note });
    } catch (e) { handleErr(res, e); }
  };

  /** DELETE /notes/:id */
  deleteById = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.noteService.deleteById(
        req.params.id,
        req.auth!.userId,
        req.auth!.role,
      );
      sendOk(res, { message: "Đã xóa ghi chú" });
    } catch (e) { handleErr(res, e); }
  };
}
