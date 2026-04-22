import { Router } from "express";
import multer from "multer";
import type { UserController } from "../controllers/user.controller.js";
import type { AuthMiddleware } from "../../middleware/auth.middleware.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

export function userRoutes(
  userController: UserController,
  auth: AuthMiddleware,
): Router {
  const r = Router();

  r.get(
    "/",
    auth.authenticate,
    auth.requireRoles("admin"),
    userController.list,
  );
  r.get(
    "/:id",
    auth.authenticate,
    auth.requireSelfOrAdmin("id"),
    userController.getById,
  );
  r.post(
    "/:id/avatar",
    auth.authenticate,
    auth.requireSelfOrAdmin("id"),
    upload.single("file"),
    userController.uploadAvatar,
  );
  return r;
}
