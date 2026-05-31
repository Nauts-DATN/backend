import nodemailer from "nodemailer";
import { env } from "../config/env.js";

export class EmailService {
  private createTransporter() {
    return nodemailer.createTransport({
      host: env.mail.smtpHost,
      port: env.mail.smtpPort,
      secure: env.mail.smtpSecure,
      auth:
        env.mail.smtpUser && env.mail.smtpPass
          ? { user: env.mail.smtpUser, pass: env.mail.smtpPass }
          : undefined,
    });
  }

  async sendVerificationEmail(
    to: string,
    verifyUrl: string,
    code: string,
  ): Promise<void> {
    const subject = "Xác thực email — EduAI";
    const text = [
      `Mã xác nhận (6 số): ${code}`,
      `(Có hiệu lực trong ${env.mail.verificationExpiresHours} giờ)`,
      "",
      "Hoặc mở liên kết:",
      verifyUrl,
    ].join("\n");
    const html = `<p><strong>Mã xác nhận:</strong> <code style="font-size:1.25rem">${code}</code></p>
<p>Hoặc nhấn: <a href="${verifyUrl}">Xác thực bằng liên kết</a></p>
<p>Liên kết &amp; mã hết hạn sau ${env.mail.verificationExpiresHours} giờ.</p>`;

    if (!env.mail.smtpHost) {
      console.log(
        `[email] (SMTP chưa cấu hình — chỉ log)\nTo: ${to}\nSubject: ${subject}\nMã: ${code}\n${verifyUrl}\n`,
      );
      return;
    }

    const transporter = this.createTransporter();

    await transporter.sendMail({
      from: env.mail.from,
      to,
      subject,
      text,
      html,
    });
  }

  async sendPasswordResetEmail(to: string, code: string): Promise<void> {
    const subject = "Đặt lại mật khẩu — EduAI";
    const text = [
      `Mã đặt lại mật khẩu (6 số): ${code}`,
      `(Có hiệu lực trong ${env.mail.passwordResetExpiresMinutes} phút)`,
      "",
      "Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.",
    ].join("\n");
    const html = `<p><strong>Mã đặt lại mật khẩu:</strong> <code style="font-size:1.25rem">${code}</code></p>
<p>Mã hết hạn sau ${env.mail.passwordResetExpiresMinutes} phút.</p>
<p>Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>`;

    if (!env.mail.smtpHost) {
      console.log(
        `[email] (SMTP chưa cấu hình — chỉ log)\nTo: ${to}\nSubject: ${subject}\nMã: ${code}\n`,
      );
      return;
    }

    const transporter = this.createTransporter();
    await transporter.sendMail({
      from: env.mail.from,
      to,
      subject,
      text,
      html,
    });
  }
}
