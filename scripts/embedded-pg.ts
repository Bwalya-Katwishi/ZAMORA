import { existsSync } from "node:fs";
import EmbeddedPostgres from "embedded-postgres";
import { loadEnvFile } from "../src/lib/env";

async function main(): Promise<void> {
  loadEnvFile();
  const port = Number(process.env.POSTGRES_PORT ?? 5432);
  const pg = new EmbeddedPostgres({
    databaseDir: "data/pg",
    user: process.env.POSTGRES_USER ?? "zamora",
    password: process.env.POSTGRES_PASSWORD ?? "zamora",
    port,
    persistent: true,
  });
  if (!existsSync("data/pg/PG_VERSION")) await pg.initialise();
  await pg.start();
  try {
    await pg.createDatabase(process.env.POSTGRES_DB ?? "zamora");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/already exists/i.test(message)) throw error;
  }
  console.log(`embedded postgres listening on ${port}`);
  await new Promise(() => undefined);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
