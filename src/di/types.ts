import type { S3StorageService } from "../storage/s3-storage.service.js";
import type { UserRepository } from "../repositories/user.repository.js";
import type { UserService } from "../services/user.service.js";
import type { HealthService } from "../services/health.service.js";
import type { UserController } from "../api/controllers/user.controller.js";
import type { HealthController } from "../api/controllers/health.controller.js";

export interface Cradle {
  s3Storage: S3StorageService;
  userRepository: UserRepository;
  userService: UserService;
  healthService: HealthService;
  userController: UserController;
  healthController: HealthController;
}
