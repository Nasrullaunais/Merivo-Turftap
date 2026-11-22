import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/modules/*/*.tables.ts",
  out: "./migrations",
  strict: true,
});
