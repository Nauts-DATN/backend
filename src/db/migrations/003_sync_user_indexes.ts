import type { BaseMigration } from "../../interfaces/base-migration.js";
import { UserModel } from "../../models/user.model.js";

export const migration003SyncUserIndexes: BaseMigration = {
  name: "003_sync_user_indexes",
  async up() {
    await UserModel.syncIndexes();
  },
};
