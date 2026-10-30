import { Pool, type QueryResultRow } from "pg";

const globalForPg = globalThis as unknown as { pool?: Pool };

export function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set.");
  if (!globalForPg.pool) {
    globalForPg.pool = new Pool({ connectionString, max: 8 });
  }
  return globalForPg.pool;
}

export async function query<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  const result = await getPool().query<T>(text, params);
  return result.rows;
}

export async function databaseAvailable(): Promise<boolean> {
  try {
    if (!process.env.DATABASE_URL) return false;
    const rows = await query<{ ready: string | null }>("select to_regclass('public.documents') as ready");
    return Boolean(rows[0]?.ready);
  } catch {
    return false;
  }
}
