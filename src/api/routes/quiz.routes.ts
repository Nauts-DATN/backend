import { Router } from "express";
import type { AiController } from "../controllers/ai.controller.js";
import type { AuthMiddleware } from "../../middleware/auth.middleware.js";

export function quizRoutes(
  aiController: AiController,
  auth: AuthMiddleware,
): Router {
  const r = Router();

  /** Lấy danh sách tất cả quiz của người dùng hiện tại. */
  r.get("/", auth.authenticate, aiController.listQuizzes);

  /** Lấy chi tiết một quiz. */
  r.get("/:id", auth.authenticate, aiController.getQuizById);

  /** Xóa một quiz. */
  r.delete("/:id", auth.authenticate, aiController.deleteQuiz);

  return r;
}
