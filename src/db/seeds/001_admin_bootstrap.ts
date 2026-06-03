import bcrypt from "bcrypt";
import type { BaseSeed } from "../../interfaces/base-seed.js";
import { UserModel } from "../../models/user.model.js";
import { env } from "../../config/env.js";

const SALT_ROUNDS = 10;

export const seed001AdminBootstrap: BaseSeed = {
  name: "001_admin_bootstrap",
  async run() {
    const email = env.adminBootstrap?.email?.trim().toLowerCase();
    const password = env.adminBootstrap?.password;
    const name = env.adminBootstrap?.name ?? "Admin";

    if (!email || !password) {
      console.log(
        "[seed] 001_admin_bootstrap: bỏ qua (thiếu ADMIN_BOOTSTRAP_EMAIL / ADMIN_BOOTSTRAP_PASSWORD) — không ghi seed record",
      );
      return { record: false };
    }

    const existing = await UserModel.findOne({ email }).lean().exec();
    if (existing) {
      console.log(
        `[seed] 001_admin_bootstrap: user ${email} đã tồn tại — đánh dấu seed đã áp dụng`,
      );
      return { record: true };
    }

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    await UserModel.create({
      email,
      name,
      password: hash,
      role: "admin",
      emailVerified: true,
    });
    console.log(`[seed] 001_admin_bootstrap: đã tạo admin ${email}`);
    return { record: true };
  },
};
