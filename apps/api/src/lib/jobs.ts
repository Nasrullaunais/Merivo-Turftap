import { PgBoss, type SendOptions } from "pg-boss";

import { config } from "./config";
import { currentTxClient } from "./db";
import { logger } from "./logger";
import { runWithRequestContext } from "./request-context";

type Handler<Data> = (data: Data) => Promise<void>;

const boss = new PgBoss({ connectionString: config.databaseUrl });
boss.on("error", (error) => logger.error({ err: error }, "job queue error"));

const handlers = new Map<string, Handler<never>>();

/** A cron expression read on the clock of `timeZone`, such as "5 0 * * *" for 00:05 every day. */
type Schedule = { cron: string; timeZone: string };
const schedules = new Map<string, Schedule>();

/** Handlers re-check the row's current state: things may have moved on since the job was queued. */
export function defineJob<Data extends object>(name: string, handler: Handler<Data>) {
  if (handlers.has(name)) throw new Error(`Job ${name} is defined twice`);
  handlers.set(name, handler as Handler<never>);
  return {
    name,
    /** Inside `transaction()` the job is saved with the data, so it only exists if that commits. */
    queue: (data: Data, options: Omit<SendOptions, "db"> = {}) => {
      const client = currentTxClient();
      const db = client && {
        executeSql: (text: string, values: unknown[]) => client.query(text, values),
      };
      return boss.send(name, data, { ...options, ...(db && { db }) });
    },
  };
}

/** A job queued by the clock. A run missed while the API was down happens once when it is back. */
export function defineScheduledJob(name: string, schedule: Schedule, handler: () => Promise<void>) {
  defineJob<object>(name, handler);
  schedules.set(name, schedule);
}

/** Creates the queues and schedules; with `work`, also starts handling jobs (the API process does, tests may not). */
export async function startJobs({ work }: { work: boolean }) {
  await boss.start();
  for (const [name, handler] of handlers) {
    if (!(await boss.getQueue(name))) await boss.createQueue(name);
    const schedule = schedules.get(name);
    if (schedule)
      await boss.schedule(name, schedule.cron, null, { tz: schedule.timeZone, missed: "once" });
    if (!work) continue;
    await boss.work<object>(name, async (jobs) => {
      for (const job of jobs) {
        await runWithRequestContext({ requestId: `job-${job.id}` }, async () => {
          try {
            await handler(job.data as never);
          } catch (error) {
            logger.error({ err: error, job: name }, "job failed");
            throw error;
          }
        });
      }
    });
  }
}

export const stopJobs = () => boss.stop({ graceful: true });
