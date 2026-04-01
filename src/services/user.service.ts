import { randomUUID } from "node:crypto";
import type { UserRepository } from "../repositories/user.repository.js";
import type { S3StorageService } from "../storage/s3-storage.service.js";

export class UserService {
  constructor(
    userRepository: UserRepository,
    s3Storage: S3StorageService,
  ) {
    this.userRepository = userRepository;
    this.s3Storage = s3Storage;
  }

  private readonly userRepository: UserRepository;
  private readonly s3Storage: S3StorageService;

  async createUser(email: string, name: string) {
    const existing = await this.userRepository.findByEmail(email);
    if (existing) {
      const err = new Error("Email đã được sử dụng") as Error & { status?: number };
      err.status = 409;
      throw err;
    }
    return this.userRepository.create({ email, name });
  }

  async listUsers() {
    return this.userRepository.list();
  }

  async getUserById(id: string) {
    return this.userRepository.findById(id);
  }

  async uploadAvatar(userId: string, buffer: Buffer, contentType: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      const err = new Error("Không tìm thấy user") as Error & { status?: number };
      err.status = 404;
      throw err;
    }

    const ext = contentType.includes("png")
      ? "png"
      : contentType.includes("jpeg") || contentType.includes("jpg")
        ? "jpg"
        : "bin";
    const key = `avatars/${userId}/${randomUUID()}.${ext}`;

    if (user.avatarKey) {
      await this.s3Storage.deleteObject(user.avatarKey).catch(() => undefined);
    }

    await this.s3Storage.putObject(key, buffer, contentType);
    const updated = await this.userRepository.setAvatarKey(userId, key);
    return {
      user: updated,
      objectKey: key,
      publicUrl: `${this.s3Storage.getPublicBaseUrl()}/${key}`,
    };
  }
}
