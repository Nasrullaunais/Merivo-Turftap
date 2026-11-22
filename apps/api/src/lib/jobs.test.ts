import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { sql } from "drizzle-orm";

import { db, transaction } from "./db";
import { defineJob, startJobs, stopJobs } from "./jobs";

const testJob = defineJob<{ marker: string }>("test-job", async () => {});

const jobsWithMarker = async (marker: string) => {
  const { rows } = await db().execute(
    sql`select id from pgboss.job where name = 'test-job' and data->>'marker' = ${marker}`,
  );
  return rows.length;
};

describe("jobs", () => {
  beforeAll(() => startJobs({ work: false }));
  afterAll(() => stopJobs());

  it("queue_insideATransactionThatCommits_savesTheJob", async () => {
    const marker = crypto.randomUUID();
    await transaction(() => testJob.queue({ marker }));
    expect(await jobsWithMarker(marker)).toBe(1);
  });

  it("queue_insideATransactionThatFails_dropsTheJob", async () => {
    const marker = crypto.randomUUID();
    const failing = transaction(async () => {
      await testJob.queue({ marker });
      throw new Error("the booking did not save");
    });
    await expect(failing).rejects.toThrow("the booking did not save");
    expect(await jobsWithMarker(marker)).toBe(0);
  });
});
