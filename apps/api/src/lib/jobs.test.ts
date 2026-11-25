import { beforeAll, describe, expect, it } from "bun:test";
import { sql } from "drizzle-orm";

import { db, transaction } from "./db";
import { defineJob, defineScheduledJob, startJobs } from "./jobs";

const testJob = defineJob<{ marker: string }>("test-job", async () => {});
defineScheduledJob(
  "test-daily-job",
  { cron: "5 0 * * *", timeZone: "Asia/Colombo" },
  async () => {},
);

const jobsWithMarker = async (marker: string) => {
  const { rows } = await db().execute(
    sql`select id from pgboss.job where name = 'test-job' and data->>'marker' = ${marker}`,
  );
  return rows.length;
};

describe("jobs", () => {
  // The test setup started the queues before this file defined test-job; this creates its queue.
  beforeAll(() => startJobs({ work: false }));

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

  it("startJobs_scheduledJob_isQueuedByTheClockOfItsTimeZone", async () => {
    const { rows } = await db().execute(
      sql`select cron, timezone from pgboss.schedule where name = 'test-daily-job'`,
    );
    expect(rows).toEqual([{ cron: "5 0 * * *", timezone: "Asia/Colombo" }]);
  });
});
