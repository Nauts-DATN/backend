import { Router } from "express";
import multer from "multer";
import type { DocumentController } from "../controllers/document.controller.js";
import type { NoteController } from "../controllers/note.controller.js";
import type { AiController } from "../controllers/ai.controller.js";
import type { AuthMiddleware } from "../../middleware/auth.middleware.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
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
  // Hỗ trợ PATCH trực tiếp theo id (phù hợp swagger cũ)

  /** Lấy ghi chú của document. */
  r.get("/:id/note", auth.authenticate, noteController.getByDocument);

  /** Lấy bản tóm tắt AI đã lưu (không gọi lại AI). */
  r.get("/:id/summary", auth.authenticate, aiController.getCachedSummary);

  /** Tóm tắt nội dung tài liệu bằng AI và lưu vào DB. */
  r.post("/:id/summarize", auth.authenticate, aiController.summarizeDocument);

  /** Tạo bộ câu hỏi từ tài liệu bằng AI và lưu vào DB. */
  r.post("/:id/quiz", auth.authenticate, aiController.generateQuiz);

  /** Lấy danh sách quiz của document. */
  r.get("/:id/quizzes", auth.authenticate, aiController.listQuizzesByDocument); 

  return r;
}
