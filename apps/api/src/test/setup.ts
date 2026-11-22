// Runs before every test file (bunfig.toml). Tests never touch the development database.
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgres://turftap:turftap@127.0.0.1:5433/turftap_test";
process.env.LOG_LEVEL ??= "silent";
process.env.AUTH_CACHE_SECONDS = "0";

const { runMigrations } = await import("../lib/db/migrate");
const { installPorts } = await import("../ports");
const { testPorts } = await import("./ports");

await runMigrations(process.env.DATABASE_URL);
installPorts(testPorts);
