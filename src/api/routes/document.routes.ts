import { Router } from "express";
import multer from "multer";
import type { DocumentController } from "../controllers/document.controller.js";
import type { NoteController } from "../controllers/note.controller.js";
import type { AiController } from "../controllers/ai.controller.js";
import type { AuthMiddleware } from "../../middleware/auth.middleware.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

export function documentRoutes(
  documentController: DocumentController,
  noteController: NoteController,
  aiController: AiController,
  auth: AuthMiddleware,
): Router {
  const r = Router();

  r.post(
    "/",
    auth.authenticate,
    upload.single("file"),
    documentController.upload,
  );

  r.get("/", auth.authenticate, documentController.list);

  r.get("/:id", auth.authenticate, documentController.getById);

  r.get("/:id/presigned-url", auth.authenticate, documentController.presignedUrl);

  r.get("/:id/download", auth.authenticate, documentController.download);

  r.delete("/:id", auth.authenticate, documentController.deleteById);

  /** Lấy ghi chú của document. */
  r.get("/:id/note", auth.authenticate, noteController.getByDocument);

  /** Tóm tắt nội dung tài liệu bằng AI. */
  r.post("/:id/summarize", auth.authenticate, aiController.summarizeDocument);

  return r;
}
