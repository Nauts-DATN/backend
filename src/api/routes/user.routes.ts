import { Router } from "express";
import multer from "multer";
import type { UserController } from "../controllers/user.controller.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

export function userRoutes(userController: UserController): Router {
  const r = Router();
  r.get("/", userController.list);
  r.post("/", userController.create);
  r.get("/:id", userController.getById);
  r.post(
    "/:id/avatar",
    upload.single("file"),
    userController.uploadAvatar,
  );
  return r;
}
