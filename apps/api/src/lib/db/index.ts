import { AsyncLocalStorage } from "node:async_hooks";

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";

import { config } from "../config";
import { translateDbError } from "./translate";

export type Db = NodePgDatabase;
type Connection = ReturnType<typeof oneQueryAtATime>;
type OpenTx = { tx: Db; connection: Connection; afterCommit: (() => void)[] };

export const pool = new pg.Pool({ connectionString: config.databaseUrl });
const rootDb: Db = drizzle(pool);
const currentTx = new AsyncLocalStorage<OpenTx>();

/**
 * The database to query: the open transaction if there is one, otherwise the pool.
 * Repositories call this instead of taking a connection parameter.
 */
export const db = (): Db => currentTx.getStore()?.tx ?? rootDb;

/** The open transaction's connection, for libraries that write their own SQL (pg-boss). */
export const currentTxClient = (): Connection | undefined => currentTx.getStore()?.connection;

/** Runs `fn` once the open transaction commits, and never if it rolls back. With none open, now. */
export function afterCommit(fn: () => void): void {
  const open = currentTx.getStore();
  if (open) open.afterCommit.push(fn);
  else fn();
}

/**
 * A connection runs one query at a time. This makes queries started together (`Promise.all`)
 * wait their turn, which pg 8 did for us with a warning and pg 9 stops doing.
 */
function oneQueryAtATime(client: pg.PoolClient) {
  let previous: Promise<unknown> = Promise.resolve();
  return {
    query: (text: string | pg.QueryConfig, values?: unknown[]): Promise<pg.QueryResult> => {
      const next = previous.then(() => client.query(text, values));
      previous = next.catch(() => undefined);
      return next;
    },
  };
}

/**
 * Runs `fn` in one transaction. Every repository call and queued job inside it uses the same
 * connection, and database rule violations come out as our own errors.
 */
export async function transaction<T>(fn: () => Promise<T>): Promise<T> {
  if (currentTx.getStore()) return fn();
  const client = await pool.connect();
  const connection = oneQueryAtATime(client);
  // Drizzle only calls query(), but its types ask for a whole pg client.
  const tx = drizzle({ client: connection as unknown as pg.PoolClient });
  const open: OpenTx = { tx, connection, afterCommit: [] };
  let result: T;
  try {
    await connection.query("BEGIN");
    result = await currentTx.run(open, fn);
    await connection.query("COMMIT");
  } catch (error) {
    await connection.query("ROLLBACK");
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
