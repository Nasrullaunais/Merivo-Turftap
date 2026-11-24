import { AsyncLocalStorage } from "node:async_hooks";

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";

import { config } from "../config";
import { translateDbError } from "./translate";

export type Db = NodePgDatabase;
type Tx = Db & { $client: pg.PoolClient };
type OpenTx = { tx: Tx; afterCommit: (() => void)[] };

export const pool = new pg.Pool({ connectionString: config.databaseUrl });
const rootDb: Db = drizzle(pool);
const currentTx = new AsyncLocalStorage<OpenTx>();

/**
 * The database to query: the open transaction if there is one, otherwise the pool.
 * Repositories call this instead of taking a connection parameter.
 */
export const db = (): Db => currentTx.getStore()?.tx ?? rootDb;

/** The open transaction's connection, for libraries that write their own SQL (pg-boss). */
export const currentTxClient = (): pg.PoolClient | undefined => currentTx.getStore()?.tx.$client;

/** Runs `fn` once the open transaction commits, and never if it rolls back. With none open, now. */
export function afterCommit(fn: () => void): void {
  const open = currentTx.getStore();
  if (open) open.afterCommit.push(fn);
  else fn();
}

/**
 * Runs `fn` in one transaction. Every repository call and queued job inside it uses the same
 * connection, and database rule violations come out as our own errors.
 */
export async function transaction<T>(fn: () => Promise<T>): Promise<T> {
  if (currentTx.getStore()) return fn();
  const client = await pool.connect();
  const open: OpenTx = { tx: drizzle(client) as Tx, afterCommit: [] };
  let result: T;
  try {
    await client.query("BEGIN");
    result = await currentTx.run(open, fn);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw translateDbError(error) ?? error;
  } finally {
    client.release();
  }
  for (const run of open.afterCommit) run();
  return result;
}

export const closeDb = () => pool.end();

export { translateDbError } from "./translate";
export { pageOf, sortBy, type PageRequest } from "./paging";
