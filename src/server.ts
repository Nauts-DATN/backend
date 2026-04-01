import { createAppContainer } from "./di/container.js";
import { createApp } from "./app.js";
import { connectMongo } from "./config/database.js";
import { env } from "./config/env.js";

async function main() {
  await connectMongo();
  const container = createAppContainer();
  await container.cradle.s3Storage.ensureBucketExists();

  const app = createApp(container);
  app.listen(env.port, () => {
    console.log(`API listening on http://localhost:${env.port}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
