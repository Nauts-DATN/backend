import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { sendFail } from "../utils/response.js";

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const message =
    err instanceof Error ? err.message : "Lỗi máy chủ không xác định";
  if (env.nodeEnv === "development" && err instanceof Error) {
    console.error(err);
  } else {
    console.error(message);
  }
  if (!res.headersSent) {
    sendFail(res, 500, message);
  }
}
