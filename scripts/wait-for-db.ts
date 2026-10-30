import pg from "pg";
import { loadEnvFile, requireEnv } from "../src/lib/env";

async function main(): Promise<void> {
  loadEnvFile();
  const connectionString = requireEnv("DATABASE_URL");
  for (let attempt = 1; attempt <= 40; attempt += 1) {
    const client = new pg.Client({ connectionString });
    try {
      await client.connect();
      await client.query("select 1");
      await client.end();
      console.log("database is ready");
      return;
    } catch {
      await client.end().catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error("Database did not become ready.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
