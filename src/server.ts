import { createAppContainer } from "./di/container.js";
import { createApp } from "./app.js";
import { connectMongo } from "./db/client.js";
import { runMigrationsIfEnabled } from "./db/migrate-runner.js";
import { runSeedsIfEnabled } from "./db/seed-runner.js";
import { env } from "./config/env.js";

async function main() {
  await connectMongo();
  await runMigrationsIfEnabled();
  await runSeedsIfEnabled();

  const container = createAppContainer();
  await container.cradle.s3Storage.ensureBucketExists();

  const app = createApp(container);
  app.listen(env.port, () => {
    console.log(`API listening on http://localhost:${env.port}`);
    if (env.db.runMigrationsOnStartup || env.db.runSeedsOnStartup) {
      console.log(
        `DB: migrationsOnStartup=${env.db.runMigrationsOnStartup} seedsOnStartup=${env.db.runSeedsOnStartup}`,
      );
    }
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
