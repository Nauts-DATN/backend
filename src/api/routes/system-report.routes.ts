import { Router } from "express";
import type { SystemReportController } from "../controllers/system-report.controller.js";
import type { AuthMiddleware } from "../../middleware/auth.middleware.js";

export function systemReportRoutes(
  systemReportController: SystemReportController,
  auth: AuthMiddleware,
): Router {
  const r = Router();

  r.post("/", auth.authenticate, systemReportController.create);
  r.get("/mine", auth.authenticate, systemReportController.listMine);
  r.get(
    "/admin",
    auth.authenticate,
    auth.requireRoles("admin"),
    systemReportController.listAll,
  );
  r.get("/:id", auth.authenticate, systemReportController.getById);
  r.patch(
    "/:id/complete",
    auth.authenticate,
    auth.requireRoles("admin"),
    systemReportController.markCompleted,
  );

  return r;
}
