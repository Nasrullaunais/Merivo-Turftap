import { createApp } from "./app";
import { config } from "./lib/config";
import { closeDb } from "./lib/db";
import { startJobs, stopJobs } from "./lib/jobs";
import { logger } from "./lib/logger";
import { installPorts } from "./ports";
import { createPorts } from "./wiring";

installPorts(createPorts(config));
await startJobs({ work: true });

const server = Bun.serve({ port: config.port, fetch: createApp().fetch });
logger.info({ port: server.port, env: config.env }, "API started");

async function shutdown(signal: string) {
  logger.info({ signal }, "shutting down");
  await server.stop();
  await stopJobs();
  await closeDb();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
