import type { BaseMigration } from "../../interfaces/base-migration.js";
import { migration001EnsureUserIndexes } from "./001_ensure_indexes.js";
import { migration002EmailVerificationGrandfather } from "./002_email_verification_grandfather.js";
import { migration003SyncUserIndexes } from "./003_sync_user_indexes.js";

/** Thứ tự mảng = thứ tự chạy (đã sort theo `name` trong runner). */
export const migrations: BaseMigration[] = [
  migration001EnsureUserIndexes,
  migration002EmailVerificationGrandfather,
  migration003SyncUserIndexes,
];
