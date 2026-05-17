import { Router } from "express";
import type { CourseController } from "../controllers/course.controller.js";
import type { AuthMiddleware } from "../../middleware/auth.middleware.js";

export function courseRoutes(
  courseController: CourseController,
  auth: AuthMiddleware,
): Router {
  const r = Router();

  r.get("/", auth.authenticate, courseController.list);
  r.get("/:id", auth.authenticate, courseController.getById);
  r.post("/", auth.authenticate, auth.requireRoles("admin"), courseController.create);
  r.patch("/:id", auth.authenticate, auth.requireRoles("admin"), courseController.update);
  r.delete("/:id", auth.authenticate, auth.requireRoles("admin"), courseController.deleteById);

  return r;
}
