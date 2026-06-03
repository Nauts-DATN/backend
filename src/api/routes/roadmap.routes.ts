import { Router } from "express";
import type { RoadmapController } from "../controllers/roadmap.controller.js";
import type { AuthMiddleware } from "../../middleware/auth.middleware.js";

export function roadmapRoutes(
  roadmapController: RoadmapController,
  auth: AuthMiddleware,
): Router {
  const r = Router();

  r.post("/", auth.authenticate, roadmapController.createRoadmap);
  r.get("/", auth.authenticate, roadmapController.listRoadmaps);
  r.get("/:id", auth.authenticate, roadmapController.getRoadmapById);
  r.patch("/:id", auth.authenticate, roadmapController.updateRoadmap);
  r.delete("/:id", auth.authenticate, roadmapController.deleteRoadmap);

  r.post("/:id/tasks", auth.authenticate, roadmapController.addTask);
  r.patch("/tasks/:taskId", auth.authenticate, roadmapController.updateTask);
  r.delete("/tasks/:taskId", auth.authenticate, roadmapController.deleteTask);
  r.patch(
    "/tasks/:taskId/complete",
    auth.authenticate,
    roadmapController.completeTask,
  );
  r.patch(
    "/tasks/:taskId/document",
    auth.authenticate,
    roadmapController.attachDocument,
  );

  return r;
}
