import type { Actor } from "../auth/context";
import { Conflict, httpErrors } from "../errors";

type Table<Status extends string> = Partial<
  Record<Status, Partial<Record<Status, readonly Actor[]>>>
>;

/**
 * The status changes a resource allows and who may make each one. Services call `check` before
 * the conditional UPDATE; anything not listed is refused.
 */
export function transitions<Status extends string>(table: Table<Status>) {
  return {
    check(actor: Actor, from: Status, to: Status): void {
      const allowedActors = table[from]?.[to];
      if (!allowedActors) {
        throw new Conflict("tt_sts_001", `The status cannot change from ${from} to ${to}`);
      }
      if (!allowedActors.includes(actor)) throw httpErrors.notAllowed();
    },
  };
}

/** For a conditional UPDATE that matched no row: someone else changed the status first. */
export const statusChangedMeanwhile = () =>
  new Conflict("tt_sts_002", "This was changed by someone else. Reload and try again.");
