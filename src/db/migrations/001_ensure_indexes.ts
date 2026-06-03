import type { BaseMigration } from "../../interfaces/base-migration.js";
import { UserModel } from "../../models/user.model.js";

export const migration001EnsureUserIndexes: BaseMigration = {
  name: "001_ensure_user_indexes",
  async up() {
    await UserModel.syncIndexes();
  },
};
