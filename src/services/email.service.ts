import nodemailer from "nodemailer";
import { env } from "../config/env.js";

export class EmailService {
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

    const transporter = nodemailer.createTransport({
      host: env.mail.smtpHost,
      port: env.mail.smtpPort,
      secure: env.mail.smtpSecure,
      auth:
        env.mail.smtpUser && env.mail.smtpPass
          ? { user: env.mail.smtpUser, pass: env.mail.smtpPass }
          : undefined,
    });

    await transporter.sendMail({
      from: env.mail.from,
      to,
      subject,
      text,
      html,
    });
  }
}
