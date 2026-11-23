import { closeDb } from "../src/lib/db";
import { AppError } from "../src/lib/errors";

/**
 * Runs a Platform Admin script (D-25). A refused request prints its code and message, like the
 * API's error reply, and exits with 1. Anything else is a bug and keeps its stack trace.
 */
export async function adminScript<const Names extends readonly string[]>(
  command: string,
  argNames: Names,
  run: (args: { [K in keyof Names]: string }) => Promise<string>,
) {
  const args = process.argv.slice(2);
  if (args.length !== argNames.length) {
    console.error(`Usage: bun run ${command} ${argNames.map((name) => `<${name}>`).join(" ")}`);
    process.exit(1);
  }
  try {
    console.log(await run(args as { [K in keyof Names]: string }));
  } catch (error) {
    if (!(error instanceof AppError)) throw error;
    console.error(`${error.code}: ${error.message}`);
    for (const field of error.fieldErrors ?? [])
      console.error(`  ${field.field}: ${field.message}`);
    process.exitCode = 1;
  } finally {
    await closeDb();
  }
}
