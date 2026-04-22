import { Router } from "express";
import type { CategoryController } from "../controllers/category.controller.js";
import type { AuthMiddleware } from "../../middleware/auth.middleware.js";

export function categoryRoutes(
  categoryController: CategoryController,
  auth: AuthMiddleware,
): Router {
  const r = Router();

  r.get("/", auth.authenticate, categoryController.list);
  r.get("/:id", auth.authenticate, categoryController.getById);
  r.post("/", auth.authenticate, auth.requireRoles("admin"), categoryController.create);
  r.patch("/:id", auth.authenticate, auth.requireRoles("admin"), categoryController.update);
  r.delete("/:id", auth.authenticate, auth.requireRoles("admin"), categoryController.deleteById);

  return r;
}
