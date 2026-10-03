import { Pool } from "pg";
import { getEnv } from "@/lib/env";

let pool: Pool | undefined;

function getPool(): Pool {
  pool ??= new Pool({
    connectionString: getEnv().DATABASE_URL,
    max: 1,
    connectionTimeoutMillis: 5_000,
  });
  return pool;
}

/** Closes the connection pool (used by tests so the process can exit). */
export async function endPool(): Promise<void> {
  await pool?.end();
  pool = undefined;
}

/** Runs `SELECT 1`; resolves true when the database answers. */
export async function pingDatabase(): Promise<boolean> {
  const result = await getPool().query("SELECT 1 AS ok");
  return result.rows[0]?.ok === 1;
}
