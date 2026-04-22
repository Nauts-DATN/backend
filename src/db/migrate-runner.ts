import { env } from "../config/env.js";
import type { BaseMigration } from "../interfaces/base-migration.js";
import { MigrationRecordModel } from "./models/migration-record.model.js";
import { migrations } from "./migrations/index.js";

function sortMigrations(list: BaseMigration[]): BaseMigration[] {
  return [...list].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Chạy các migration chưa có trong `_migration_records`.
 * Cần đã `connectMongo()` trước.
 */
export async function runMigrations(): Promise<void> {
  const sorted = sortMigrations(migrations);
  const applied = await MigrationRecordModel.find()
    .lean()
    .exec();
  const appliedNames = new Set(applied.map((r) => r.name));

  for (const m of sorted) {
    if (appliedNames.has(m.name)) {
      continue;
    }
    console.log(`[migrate] Running: ${m.name}`);
    await m.up();
    await MigrationRecordModel.create({ name: m.name });
    console.log(`[migrate] Done: ${m.name}`);
  }
}

export async function runMigrationsIfEnabled(): Promise<void> {
  if (!env.db.runMigrationsOnStartup) {
    return;
  }
  console.log("[migrate] RUN_MIGRATIONS_ON_STARTUP=true — chạy migrations...");
  await runMigrations();
}

export async function migrationStatus(): Promise<{
  pending: string[];
  applied: string[];
}> {
  const sorted = sortMigrations(migrations);
  const applied = await MigrationRecordModel.find()
    .sort({ name: 1 })
    .lean()
    .exec();
  const appliedNames = new Set(applied.map((r) => r.name));
  const pending = sorted
    .filter((m) => !appliedNames.has(m.name))
    .map((m) => m.name);
  return {
    pending,
    applied: applied.map((r) => r.name),
  };
}
