import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import { env } from "../config/env.js";
import type { UserRepository } from "../repositories/user.repository.js";
import type { S3StorageService } from "../storage/s3-storage.service.js";
import { toPublicUser, type PublicUser } from "../utils/user-public.js";

const SALT_ROUNDS = 10;

function makeErr(message: string, status: number): Error & { status: number } {
  const err = new Error(message) as Error & { status: number };
  err.status = status;
  return err;
}

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

  async listUsers(search?: string): Promise<PublicUser[]> {
    const rows = await this.userRepository.list(100, search);
    return rows.map((u) => toPublicUser(u));
  }

  async getUserById(id: string): Promise<PublicUser | null> {
    const user = await this.userRepository.findById(id);
    if (!user) return null;
    return toPublicUser(user);
  }

  async updateName(userId: string, name: string): Promise<PublicUser> {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw makeErr("Tên không được để trống", 400);
    }

    const updated = await this.userRepository.updateName(userId, trimmedName);
    if (!updated) throw makeErr("Không tìm thấy user", 404);
    return toPublicUser(updated);
  }

  async updatePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    if (!currentPassword || !newPassword) {
      throw makeErr("Thiếu mật khẩu hiện tại hoặc mật khẩu mới", 400);
    }
    if (newPassword.length < 6) {
      throw makeErr("Mật khẩu mới phải có ít nhất 6 ký tự", 400);
    }

    const user = await this.userRepository.findByIdWithPassword(userId);
    if (!user?.password) throw makeErr("Không tìm thấy user", 404);

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw makeErr("Mật khẩu hiện tại không đúng", 400);
    }

    const nextPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.userRepository.updatePassword(userId, nextPassword);
  }

  async uploadAvatar(userId: string, buffer: Buffer, contentType: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw makeErr("Không tìm thấy user", 404);

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
      publicUrl: `${env.apiPublicUrl}/api/users/${userId}/avatar`,
    };
  }

  async getAvatar(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw makeErr("Không tìm thấy user", 404);
    if (!user.avatar) throw makeErr("User chưa có avatar", 404);
    return this.s3Storage.getObject(user.avatar);
  }

  async setUserBlocked(
    targetUserId: string,
    isBlocked: boolean,
    requesterId: string,
  ): Promise<PublicUser> {
    if (targetUserId === requesterId) {
      throw makeErr("Không thể khóa tài khoản của chính mình", 400);
    }

    const target = await this.userRepository.findById(targetUserId);
    if (!target) throw makeErr("Không tìm thấy user", 404);
    if (target.role === "admin") {
      throw makeErr("Không thể khóa tài khoản admin", 400);
    }

    const updated = await this.userRepository.setBlocked(targetUserId, isBlocked);
    if (!updated) throw makeErr("Không tìm thấy user", 404);
    return toPublicUser(updated);
  }

  async deleteUser(targetUserId: string, requesterId: string): Promise<void> {
    if (targetUserId === requesterId) {
      throw makeErr("Không thể xóa tài khoản của chính mình", 400);
    }

    const target = await this.userRepository.findById(targetUserId);
    if (!target) throw makeErr("Không tìm thấy user", 404);
    if (target.role === "admin") {
      throw makeErr("Không thể xóa tài khoản admin", 400);
    }
    if (target.avatar) {
      await this.s3Storage.deleteObject(target.avatar).catch(() => undefined);
    }

    const ok = await this.userRepository.deleteById(targetUserId);
    if (!ok) throw makeErr("Không tìm thấy user", 404);
  }
}
