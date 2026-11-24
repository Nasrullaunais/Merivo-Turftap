import { describe, expect, it } from "bun:test";
import { sql } from "drizzle-orm";

import { db, transaction } from ".";

const PG9_REMOVES_OVERLAPPING_QUERIES = /already executing a query/;

describe("transaction", () => {
  it("transaction_queriesStartedTogether_runWithoutOverlappingOnTheConnection", async () => {
    const warnings: string[] = [];
    const listen = (warning: Error) => warnings.push(warning.message);
    process.on("warning", listen);
    try {
      const results = await transaction(() =>
        Promise.all([1, 2, 3].map((n) => db().execute(sql`select ${n}::int as n`))),
      );
      expect(results.map((result) => result.rows[0]?.n)).toEqual([1, 2, 3]);
      await new Promise((resolve) => setImmediate(resolve));
    } finally {
      process.off("warning", listen);
    }
    expect(warnings.filter((message) => PG9_REMOVES_OVERLAPPING_QUERIES.test(message))).toEqual([]);
  });
});
