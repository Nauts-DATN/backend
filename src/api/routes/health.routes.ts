import { Router } from "express";
import type { HealthController } from "../controllers/health.controller.js";

export function healthRoutes(healthController: HealthController): Router {
  const r = Router();
  r.get("/", healthController.get);
  return r;
}
