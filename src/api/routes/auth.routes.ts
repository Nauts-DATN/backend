import { Router } from "express";
import type { AuthController } from "../controllers/auth.controller.js";
import type { AuthMiddleware } from "../../middleware/auth.middleware.js";

export function authRoutes(
  authController: AuthController,
  authMiddleware: AuthMiddleware,
): Router {
  const r = Router();
  r.post("/register", authController.register);
  r.post("/login", authController.login);
  r.post("/refresh", authController.refresh);
  r.post("/logout", authController.logout);
  r.get("/verify-email", authController.verifyEmail);
  r.post("/verify-email-code", authController.verifyEmailCode);
  r.post("/resend-verification", authController.resendVerification);
  r.get("/me", authMiddleware.authenticate, authController.me);
  return r;
}
