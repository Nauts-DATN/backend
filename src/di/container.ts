import { asClass, createContainer, InjectionMode } from "awilix";
import type { Cradle } from "./types.js";
import { S3StorageService } from "../storage/s3-storage.service.js";
import { UserRepository } from "../repositories/user.repository.js";
import { UserService } from "../services/user.service.js";
import { HealthService } from "../services/health.service.js";
import { UserController } from "../api/controllers/user.controller.js";
import { HealthController } from "../api/controllers/health.controller.js";

export function createAppContainer() {
  const container = createContainer<Cradle>({
    injectionMode: InjectionMode.CLASSIC,
  });

  container.register({
    s3Storage: asClass(S3StorageService).singleton(),
    userRepository: asClass(UserRepository).singleton(),
    userService: asClass(UserService).singleton(),
    healthService: asClass(HealthService).singleton(),
    userController: asClass(UserController).singleton(),
    healthController: asClass(HealthController).singleton(),
  });

  return container;
}
