import type { BaseMigration } from "../../interfaces/base-migration.js";
import { UserModel } from "../../models/user.model.js";

/** User cũ (trước khi có emailVerified) được coi là đã xác thực để không khóa đăng nhập. */
export const migration002EmailVerificationGrandfather: BaseMigration = {
  name: "002_email_verification_grandfather",
  async up() {
    await UserModel.updateMany(
      {
        $or: [
          { emailVerified: { $exists: false } },
          { emailVerified: null },
        ],
      },
      { $set: { emailVerified: true } },
    );
  },
};
