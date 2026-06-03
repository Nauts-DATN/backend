import { Router } from "express";
import type { NoteController } from "../controllers/note.controller.js";
import type { AuthMiddleware } from "../../middleware/auth.middleware.js";

export function noteRoutes(
  noteController: NoteController,
  auth: AuthMiddleware,
): Router {
  const r = Router();

  r.post("/", auth.authenticate, noteController.create);
  r.get("/", auth.authenticate, noteController.list);
  r.get("/:id", auth.authenticate, noteController.getById);
  r.put("/:id", auth.authenticate, noteController.update);
  r.delete("/:id", auth.authenticate, noteController.deleteById);

  return r;
}
