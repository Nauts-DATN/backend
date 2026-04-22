import { randomUUID } from "node:crypto";
import type { UserRepository } from "../repositories/user.repository.js";
import type { S3StorageService } from "../storage/s3-storage.service.js";
import { toPublicUser, type PublicUser } from "../utils/user-public.js";

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

  async listUsers(): Promise<PublicUser[]> {
    const rows = await this.userRepository.list();
    return rows.map((u) => toPublicUser(u));
  }

  async getUserById(id: string): Promise<PublicUser | null> {
    const user = await this.userRepository.findById(id);
    if (!user) return null;
    return toPublicUser(user);
  }

  async uploadAvatar(userId: string, buffer: Buffer, contentType: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      const err = new Error("Không tìm thấy user") as Error & {
        status?: number;
      };
      err.status = 404;
      throw err;
    }

    const ext = contentType.includes("png")
      ? "png"
      : contentType.includes("jpeg") || contentType.includes("jpg")
        ? "jpg"
        : "bin";
    const key = `avatars/${userId}/${randomUUID()}.${ext}`;

    if (user.avatar) {
      await this.s3Storage.deleteObject(user.avatar).catch(() => undefined);
    }

    await this.s3Storage.putObject(key, buffer, contentType);
    const updated = await this.userRepository.setAvatar(userId, key);
    const publicUser = updated ? toPublicUser(updated) : null;
    return {
      user: publicUser,
      objectKey: key,
      publicUrl: `${this.s3Storage.getPublicBaseUrl()}/${key}`,
    };
  }
}
