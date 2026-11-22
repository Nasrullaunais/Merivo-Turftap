import { DrizzleQueryError } from "drizzle-orm";

import { type AppError, errorForConstraint, httpErrors } from "../errors";

const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";
const EXCLUSION_VIOLATION = "23P01";

type PgError = { code?: string; constraint?: string; detail?: string };

const asPgError = (error: unknown): PgError | undefined => {
  const cause = error instanceof DrizzleQueryError ? error.cause : error;
  return cause && typeof cause === "object" && "code" in cause ? (cause as PgError) : undefined;
};

export function translateDbError(error: unknown): AppError | undefined {
  const pgError = asPgError(error);
  switch (pgError?.code) {
    case UNIQUE_VIOLATION:
      return errorForConstraint(pgError.constraint) ?? httpErrors.alreadyExists();
    case EXCLUSION_VIOLATION:
      return errorForConstraint(pgError.constraint) ?? httpErrors.timeTaken();
    case FOREIGN_KEY_VIOLATION:
      return pgError.detail?.includes("is still referenced")
        ? httpErrors.stillInUse()
        : httpErrors.missingReference();
    default:
      return undefined;
  }
}
