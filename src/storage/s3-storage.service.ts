import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Readable } from "node:stream";
import { env } from "../config/env.js";

export class S3StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    this.bucket = env.s3.bucket;
    this.client = new S3Client({
      region: env.s3.region,
      endpoint: env.s3.endpoint,
      credentials: {
        accessKeyId: env.s3.accessKeyId,
        secretAccessKey: env.s3.secretAccessKey,
      },
      forcePathStyle: env.s3.forcePathStyle,
    });
  }

  getBucket(): string {
    return this.bucket;
  }

  getPublicBaseUrl(): string {
    const base = env.s3.endpoint.replace(/\/$/, "");
    return `${base}/${this.bucket}`;
  }

  async ensureBucketAccessible(): Promise<void> {
    await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
  }

  /** Tạo bucket nếu chưa có (hữu ích khi chạy MinIO local). */
  async ensureBucketExists(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }
  }

  async putObject(
    key: string,
    body: Buffer | Uint8Array,
    contentType: string,
  ): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  /**
   * Tạo presigned URL để client tải file trực tiếp từ S3/MinIO (không qua backend).
   * @param key     - S3 object key
   * @param expiresIn - Thời gian hiệu lực tính bằng giây (mặc định 15 phút)
   */
  async getPresignedUrl(key: string, expiresIn = 900): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  /** Trả về body stream + contentType để streaming tới client. */
  async getObject(
    key: string,
  ): Promise<{ body: Readable; contentType: string; contentLength?: number }> {
    const resp = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    if (!resp.Body) throw new Error("S3 object không có body");
    return {
      body: resp.Body as Readable,
      contentType: resp.ContentType ?? "application/octet-stream",
      contentLength: resp.ContentLength,
    };
  }
}
