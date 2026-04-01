import { Router } from "express";
import type { AwilixContainer } from "awilix";
import type { Cradle } from "../../di/types.js";
import { healthRoutes } from "./health.routes.js";
import { userRoutes } from "./user.routes.js";

export function registerRoutes(container: AwilixContainer<Cradle>): Router {
  const api = Router();
  const { healthController, userController } = container.cradle;

  api.use("/health", healthRoutes(healthController));
  api.use("/users", userRoutes(userController));

  return api;
}
