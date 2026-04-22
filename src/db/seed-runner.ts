import { env } from "../config/env.js";
import type { BaseSeed } from "../interfaces/base-seed.js";
import { SeedRecordModel } from "./models/seed-record.model.js";
import { seeds } from "./seeds/index.js";

function sortSeeds(list: BaseSeed[]): BaseSeed[] {
  return [...list].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Chạy các seed chưa có trong `_seed_records`.
 * Cần đã `connectMongo()` trước.
 */
export async function runSeeds(): Promise<void> {
  const sorted = sortSeeds(seeds);
  const applied = await SeedRecordModel.find().lean().exec();
  const appliedNames = new Set(applied.map((r) => r.name));

  for (const s of sorted) {
    if (appliedNames.has(s.name)) {
      continue;
    }
    console.log(`[seed] Running: ${s.name}`);
    const result = await s.run();
    const shouldRecord = result?.record !== false;
    if (!shouldRecord) {
      console.log(
        `[seed] ${s.name}: không ghi record — sẽ thử lại lần sau (vd. thiếu cấu hình)`,
      );
      continue;
    }
    await SeedRecordModel.create({ name: s.name });
    console.log(`[seed] Recorded: ${s.name}`);
  }
}

export async function runSeedsIfEnabled(): Promise<void> {
  if (!env.db.runSeedsOnStartup) {
    return;
  }
  console.log("[seed] RUN_SEEDS_ON_STARTUP=true — chạy seeds...");
  await runSeeds();
}

export async function seedStatus(): Promise<{
  pending: string[];
  applied: string[];
}> {
  const sorted = sortSeeds(seeds);
  const applied = await SeedRecordModel.find().sort({ name: 1 }).lean().exec();
  const appliedNames = new Set(applied.map((r) => r.name));
  const pending = sorted
    .filter((s) => !appliedNames.has(s.name))
    .map((s) => s.name);
  return {
    pending,
    applied: applied.map((r) => r.name),
  };
}
