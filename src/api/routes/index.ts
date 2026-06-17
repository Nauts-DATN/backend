import { Router } from "express";
import type { AwilixContainer } from "awilix";
import type { Cradle } from "../../di/types.js";
import { healthRoutes } from "./health.routes.js";
import { userRoutes } from "./user.routes.js";
import { authRoutes } from "./auth.routes.js";
import { documentRoutes } from "./document.routes.js";
import { categoryRoutes } from "./category.routes.js";
import { courseRoutes } from "./course.routes.js";
import { noteRoutes } from "./note.routes.js";
import { quizRoutes } from "./quiz.routes.js";
import { roadmapRoutes } from "./roadmap.routes.js";
import { systemReportRoutes } from "./system-report.routes.js";

export function registerRoutes(container: AwilixContainer<Cradle>): Router {
  const api = Router();
  const {
    healthController,
    userController,
    authController,
    authMiddleware,
    documentController,
    noteController,
    aiController,
    categoryController,
    courseController,
    roadmapController,
    systemReportController,
  } = container.cradle;

  api.use("/health", healthRoutes(healthController));
  api.use("/auth", authRoutes(authController, authMiddleware));
  api.use("/users", userRoutes(userController, authMiddleware));
  api.use("/documents", documentRoutes(documentController, noteController, aiController, authMiddleware));
  api.use("/categories", categoryRoutes(categoryController, authMiddleware));
  api.use("/courses", courseRoutes(courseController, authMiddleware));
  api.use("/notes", noteRoutes(noteController, authMiddleware));
  api.use("/quizzes", quizRoutes(aiController, authMiddleware));
  api.use("/roadmaps", roadmapRoutes(roadmapController, authMiddleware));
  api.use("/system-reports", systemReportRoutes(systemReportController, authMiddleware));

  return api;
}
