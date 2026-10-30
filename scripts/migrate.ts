import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";
import { loadEnvFile, requireEnv } from "../src/lib/env";

async function main(): Promise<void> {
  loadEnvFile();
  const client = new pg.Client({ connectionString: requireEnv("DATABASE_URL") });
  await client.connect();
  await client.query(`
    create table if not exists schema_migrations (
      id text primary key,
      applied_at timestamptz not null default now()
    )
  `);
  const dir = path.resolve("db/migrations");
  const files = readdirSync(dir).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) {
    const applied = await client.query("select 1 from schema_migrations where id = $1", [file]);
    if (applied.rowCount) {
      console.log(`skip ${file}`);
      continue;
    }
    const sql = readFileSync(path.join(dir, file), "utf8");
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query("insert into schema_migrations (id) values ($1)", [file]);
      await client.query("commit");
      console.log(`applied ${file}`);
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  }
  await client.end();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
