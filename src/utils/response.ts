import type { Response } from "express";

export type ApiResponse<T> = {
  status: number;
  error: unknown;
  isSuccess: boolean;
  data: T | null;
};

export function sendOk<T>(res: Response, data: T, statusCode = 200): void {
  const body: ApiResponse<T> = {
    status: statusCode,
    error: null,
    isSuccess: true,
    data,
  };
  res.status(statusCode).json(body);
}

export function sendFail(
  res: Response,
  statusCode: number,
  error: unknown,
): void {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Lỗi không xác định";
  const body: ApiResponse<null> = {
    status: statusCode,
    error: message,
    isSuccess: false,
    data: null,
  };
  res.status(statusCode).json(body);
}
