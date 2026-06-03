import { asClass, createContainer, InjectionMode } from "awilix";
import type { Cradle } from "./types.js";
import { S3StorageService } from "../storage/s3-storage.service.js";
import { UserRepository } from "../repositories/user.repository.js";
import { DocumentRepository } from "../repositories/document.repository.js";
import { NoteRepository } from "../repositories/note.repository.js";
import { QuizRepository } from "../repositories/quiz.repository.js";
import { RoadmapRepository } from "../repositories/roadmap.repository.js";
import { TaskRepository } from "../repositories/task.repository.js";
import { CategoryRepository } from "../repositories/category.repository.js";
import { CourseRepository } from "../repositories/course.repository.js";
import { JwtService } from "../services/jwt.service.js";
import { EmailService } from "../services/email.service.js";
import { AuthService } from "../services/auth.service.js";
import { UserService } from "../services/user.service.js";
import { DocumentService } from "../services/document.service.js";
import { NoteService } from "../services/note.service.js";
import { AiService } from "../services/ai.service.js";
import { PdfConverterService } from "../services/pdf-converter.service.js";
import { CategoryService } from "../services/category.service.js";
import { CourseService } from "../services/course.service.js";
import { RoadmapService } from "../services/roadmap.service.js";
import { HealthService } from "../services/health.service.js";
import { AuthMiddleware } from "../middleware/auth.middleware.js";
import { UserController } from "../api/controllers/user.controller.js";
import { HealthController } from "../api/controllers/health.controller.js";
import { AuthController } from "../api/controllers/auth.controller.js";
import { DocumentController } from "../api/controllers/document.controller.js";
import { NoteController } from "../api/controllers/note.controller.js";
import { AiController } from "../api/controllers/ai.controller.js";
import { CategoryController } from "../api/controllers/category.controller.js";
import { CourseController } from "../api/controllers/course.controller.js";
import { RoadmapController } from "../api/controllers/roadmap.controller.js";

export function createAppContainer() {
  const container = createContainer<Cradle>({
    injectionMode: InjectionMode.CLASSIC,
  });

  container.register({
    s3Storage: asClass(S3StorageService).singleton(),
    userRepository: asClass(UserRepository).singleton(),
    documentRepository: asClass(DocumentRepository).singleton(),
    noteRepository: asClass(NoteRepository).singleton(),
    quizRepository: asClass(QuizRepository).singleton(),
    roadmapRepository: asClass(RoadmapRepository).singleton(),
    taskRepository: asClass(TaskRepository).singleton(),
    categoryRepository: asClass(CategoryRepository).singleton(),
    courseRepository: asClass(CourseRepository).singleton(),
    jwtService: asClass(JwtService).singleton(),
    emailService: asClass(EmailService).singleton(),
    authService: asClass(AuthService).singleton(),
    authMiddleware: asClass(AuthMiddleware).singleton(),
    userService: asClass(UserService).singleton(),
    pdfConverterService: asClass(PdfConverterService).singleton(),
    documentService: asClass(DocumentService).singleton(),
    noteService: asClass(NoteService).singleton(),
    aiService: asClass(AiService).singleton(),
    categoryService: asClass(CategoryService).singleton(),
    courseService: asClass(CourseService).singleton(),
    roadmapService: asClass(RoadmapService).singleton(),
    healthService: asClass(HealthService).singleton(),
    userController: asClass(UserController).singleton(),
    healthController: asClass(HealthController).singleton(),
    authController: asClass(AuthController).singleton(),
    documentController: asClass(DocumentController).singleton(),
    noteController: asClass(NoteController).singleton(),
    aiController: asClass(AiController).singleton(),
    categoryController: asClass(CategoryController).singleton(),
    courseController: asClass(CourseController).singleton(),
    roadmapController: asClass(RoadmapController).singleton(),
  });

  return container;
}
