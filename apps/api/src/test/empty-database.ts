import pg from "pg";

// Any fixed number works; it only has to be the same for every test run.
const TEST_RUN_LOCK_ID = 727_002;

/**
 * Empties every table, so each run starts clean. The lock is held until this run's process ends,
 * so a second run on the same database waits instead of wiping data under the first.
 */
export async function claimEmptyDatabase(databaseUrl: string): Promise<void> {
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  await client.query("SELECT pg_advisory_lock($1)", [TEST_RUN_LOCK_ID]);
  const { rows } = await client.query<{ name: string }>(
    "SELECT quote_ident(tablename) AS name FROM pg_tables WHERE schemaname = 'public'",
  );
  // Ids keep counting up, so jobs left in the queue by earlier runs never match a new row.
  await client.query(`TRUNCATE ${rows.map((row) => row.name).join(", ")} CASCADE`);
}
