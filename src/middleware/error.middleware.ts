import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { env } from "../config/env.js";
import { sendFail } from "../utils/response.js";

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const message =
    err instanceof Error ? err.message : "Loi may chu khong xac dinh";
  const status = (err as { status?: number })?.status;

  if (env.nodeEnv === "development" && err instanceof Error) {
    console.error(err);
  } else {
    console.error(message);
  }

  if (res.headersSent) return;

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      sendFail(res, 413, "File qua lon. Vui long tai file toi da 15 MB.");
      return;
    }

    sendFail(res, 400, message);
    return;
  }

  sendFail(res, status ?? 500, message);
}
