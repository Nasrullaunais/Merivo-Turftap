import type { AppError } from "./app-error";

type MakeError = () => AppError;

const byConstraint = new Map<string, MakeError>();

/**
 * Gives a database constraint its own error instead of the generic "already exists".
 * Call it in `<module>.errors.ts` with the constraint names from `<module>.tables.ts`.
 */
export function constraintErrors(errors: Record<string, MakeError>): void {
  for (const [constraint, make] of Object.entries(errors)) {
    if (byConstraint.has(constraint)) throw new Error(`Constraint ${constraint} is mapped twice`);
    byConstraint.set(constraint, make);
  }
}

export const errorForConstraint = (constraint: string | undefined): AppError | undefined =>
  constraint ? byConstraint.get(constraint)?.() : undefined;
