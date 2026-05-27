import bcrypt from "bcrypt";
import { env } from "../config/env.js";
import type { UserRepository } from "../repositories/user.repository.js";
import type { JwtService } from "./jwt.service.js";
import type { EmailService } from "./email.service.js";
import type { UserRole } from "../models/user.model.js";
import { toPublicUser, type PublicUser } from "../utils/user-public.js";
import {
  generateVerificationCode,
  generateVerificationToken,
  hashVerificationCode,
  hashVerificationToken,
  normalizeVerificationCode,
  safeEqualHex,
} from "../utils/email-verification-token.js";

const SALT_ROUNDS = 10;

export class AuthService {
  constructor(
    userRepository: UserRepository,
    jwtService: JwtService,
    emailService: EmailService,
  ) {
    this.userRepository = userRepository;
    this.jwtService = jwtService;
    this.emailService = emailService;
  }

  private readonly userRepository: UserRepository;
  private readonly jwtService: JwtService;
  private readonly emailService: EmailService;

  async register(
    email: string,
    name: string,
    password: string,
    role: UserRole = "user",
  ): Promise<{ user: PublicUser; emailVerificationRequired: true }> {
    const existing = await this.userRepository.findByEmail(email);
    if (existing) {
      const err = new Error("Email đã được sử dụng") as Error & {
        status?: number;
      };
      err.status = 409;
      throw err;
    }

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const plainToken = generateVerificationToken();
    const plainCode = generateVerificationCode();
    const tokenHash = hashVerificationToken(plainToken);
    const codeHash = hashVerificationCode(plainCode);
    const expires = new Date(
      Date.now() + env.mail.verificationExpiresHours * 60 * 60 * 1000,
    );

    const created = await this.userRepository.create({
      email,
      name,
      password: hash,
      role,
      emailVerified: false,
      emailVerificationTokenHash: tokenHash,
      emailVerificationCodeHash: codeHash,
      emailVerificationExpires: expires,
    });

    const verifyUrl = `${env.apiPublicUrl}/api/auth/verify-email?token=${encodeURIComponent(plainToken)}`;
    await this.emailService.sendVerificationEmail(
      created.email,
      verifyUrl,
      plainCode,
    );

    return {
      user: toPublicUser(created),
      emailVerificationRequired: true as const,
    };
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ user: PublicUser; accessToken: string }> {
    const user = await this.userRepository.findByEmailWithPassword(email);
    if (!user?.password) {
      const err = new Error("Email hoặc mật khẩu không đúng") as Error & {
        status?: number;
      };
      err.status = 401;
      throw err;
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      const err = new Error("Email hoặc mật khẩu không đúng") as Error & {
        status?: number;
      };
      err.status = 401;
      throw err;
    }

    if (!user.emailVerified) {
      const err = new Error(
        "Vui lòng xác thực email trước khi đăng nhập. Kiểm tra hộp thư hoặc gửi lại email xác thực.",
      ) as Error & { status?: number };
      err.status = 403;
      throw err;
    }

    if (user.isBlocked) {
      const err = new Error("Tài khoản đã bị khóa") as Error & {
        status?: number;
      };
      err.status = 403;
      throw err;
    }

    const { password: _p, ...withoutPassword } = user;
    const accessToken = this.jwtService.sign(
      user._id.toString(),
      user.role,
    );
    return {
      user: toPublicUser(withoutPassword),
      accessToken,
    };
  }

  async verifyEmail(token: string): Promise<void> {
    const t = token?.trim();
    if (!t || t.length < 32) {
      const err = new Error("Token không hợp lệ") as Error & {
        status?: number;
      };
      err.status = 400;
      throw err;
    }

    const hash = hashVerificationToken(t);
    const user = await this.userRepository.findByVerificationTokenHash(hash);
    if (!user) {
      const err = new Error("Token không hợp lệ hoặc đã được sử dụng") as Error & {
        status?: number;
      };
      err.status = 400;
      throw err;
    }

    if (user.emailVerified) {
      return;
    }

    if (
      user.emailVerificationExpires &&
      user.emailVerificationExpires.getTime() < Date.now()
    ) {
      const err = new Error(
        "Liên kết xác thực đã hết hạn. Vui lòng gửi lại email xác thực.",
      ) as Error & { status?: number };
      err.status = 400;
      throw err;
    }

    await this.userRepository.markEmailVerified(user._id.toString());
  }

  /** Xác thực bằng mã 6 số + email (sau đăng ký). */
  async verifyEmailWithCode(email: string, codeRaw: string): Promise<void> {
    const emailNorm = email?.trim().toLowerCase();
    const code = normalizeVerificationCode(codeRaw ?? "");
    if (!emailNorm) {
      const err = new Error("Thiếu email") as Error & { status?: number };
      err.status = 400;
      throw err;
    }
    if (code.length !== 6) {
      const err = new Error("Mã gồm 6 chữ số") as Error & {
        status?: number;
      };
      err.status = 400;
      throw err;
    }

    const codeHash = hashVerificationCode(code);
    const user =
      await this.userRepository.findByEmailWithVerificationCode(emailNorm);

    if (!user?.emailVerificationCodeHash) {
      const err = new Error("Email hoặc mã không đúng") as Error & {
        status?: number;
      };
      err.status = 400;
      throw err;
    }

    if (!safeEqualHex(codeHash, user.emailVerificationCodeHash)) {
      const err = new Error("Email hoặc mã không đúng") as Error & {
        status?: number;
      };
      err.status = 400;
      throw err;
    }

    if (user.emailVerified) {
      return;
    }

    if (
      user.emailVerificationExpires &&
      user.emailVerificationExpires.getTime() < Date.now()
    ) {
      const err = new Error(
        "Mã đã hết hạn. Vui lòng gửi lại email xác thực.",
      ) as Error & { status?: number };
      err.status = 400;
      throw err;
    }

    await this.userRepository.markEmailVerified(user._id.toString());
  }

  /** Không leak tồn tại email — không gửi nếu không có user hoặc đã verified. */
  async resendVerificationEmail(email: string): Promise<void> {
    const user = await this.userRepository.findByEmailWithPassword(
      email.toLowerCase(),
    );
    if (!user || user.emailVerified) {
      return;
    }

    const plainToken = generateVerificationToken();
    const plainCode = generateVerificationCode();
    const tokenHash = hashVerificationToken(plainToken);
    const codeHash = hashVerificationCode(plainCode);
    const expires = new Date(
      Date.now() + env.mail.verificationExpiresHours * 60 * 60 * 1000,
    );

    await this.userRepository.setEmailVerificationData(user._id.toString(), {
      tokenHash,
      codeHash,
      expires,
    });

    const verifyUrl = `${env.apiPublicUrl}/api/auth/verify-email?token=${encodeURIComponent(plainToken)}`;
    await this.emailService.sendVerificationEmail(
      user.email,
      verifyUrl,
      plainCode,
    );
  }
}
