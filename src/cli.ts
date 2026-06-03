import "dotenv/config";
import { connectMongo, disconnectMongo } from "./db/client.js";
import { migrationStatus, runMigrations } from "./db/migrate-runner.js";
import { runSeeds, seedStatus } from "./db/seed-runner.js";
import { createMigrationFile, createSeedFile } from "./db/scaffold.js";

function printHelp(): void {
  console.log(`
Usage:
  npx tsx src/cli.ts migrate              Chạy pending migrations
  npx tsx src/cli.ts migrate:status       Danh sách applied / pending
  npx tsx src/cli.ts migration:create <slug>   Tạo file migration + cập nhật index (không cần DB)
  npx tsx src/cli.ts seed                 Chạy pending seeds
  npx tsx src/cli.ts seed:status          Danh sách applied / pending
  npx tsx src/cli.ts seed:create <slug>   Tạo file seed + cập nhật index (không cần DB)

Ví dụ slug: add_posts, fix_user_avatar
`);
}

async function main() {
  const cmd = process.argv[2];
  const arg = process.argv[3];

  if (cmd === "migration:create") {
    createMigrationFile(arg);
    return;
  }
  if (cmd === "seed:create") {
    createSeedFile(arg);
    return;
  }

  try {
    await connectMongo();

    switch (cmd) {
      case "migrate":
        await runMigrations();
        break;
      case "seed":
        await runSeeds();
        break;
      case "migrate:status": {
        const s = await migrationStatus();
        console.log(
          "Applied:",
          s.applied.length ? s.applied.join(", ") : "(none)",
        );
        console.log(
          "Pending:",
          s.pending.length ? s.pending.join(", ") : "(none)",
        );
        break;
      }
      case "seed:status": {
        const s = await seedStatus();
        console.log(
          "Applied:",
          s.applied.length ? s.applied.join(", ") : "(none)",
        );
        console.log(
          "Pending:",
          s.pending.length ? s.pending.join(", ") : "(none)",
        );
        break;
      }
      default:
        printHelp();
        process.exit(cmd ? 1 : 0);
    }
  } finally {
    await disconnectMongo();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
