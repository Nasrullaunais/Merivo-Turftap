import { runMigrations } from "../src/lib/db/migrate";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL must be set");
await runMigrations(url);
console.log("Migrations are up to date");
