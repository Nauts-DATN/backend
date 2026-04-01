import mongoose from "mongoose";
import type { S3StorageService } from "../storage/s3-storage.service.js";

export class HealthService {
  constructor(s3Storage: S3StorageService) {
    this.s3Storage = s3Storage;
  }

  private readonly s3Storage: S3StorageService;

  async getStatus(): Promise<{
    mongo: "ok" | "down";
    s3: "ok" | "down";
  }> {
    const mongo =
      mongoose.connection.readyState === 1 ? ("ok" as const) : ("down" as const);

    let s3: "ok" | "down" = "down";
    try {
      await this.s3Storage.ensureBucketAccessible();
      s3 = "ok";
    } catch {
      s3 = "down";
    }

    return { mongo, s3 };
  }
}
