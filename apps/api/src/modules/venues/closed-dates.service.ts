import type { ClosedDateFilters, CreateClosedDate, UpdateClosedDate } from "@turftap/contract";

import type { AuthContext } from "../../lib/auth/context";
import { transaction } from "../../lib/db";
import { httpErrors } from "../../lib/errors";
import type { ListQuery } from "../../lib/resource";
import { todayIn } from "../../lib/time";
import * as closedDatesRepository from "./closed-dates.repository";
import { venueErrors } from "./venues.errors";
import * as venuesService from "./venues.service";

type ClosedDateSort = "date" | "createdAt";

/** VEN-02: a date already gone can't be closed; "today" is the venue's own today. */
async function checkNotPast(auth: AuthContext, venueId: number, date: string) {
  const venue = await venuesService.get(auth, venueId);
  if (date < todayIn(venue.timeZone))
    throw httpErrors.invalidRequest([{ field: "date", message: "Must be today or later" }]);
}

export function list(
  auth: AuthContext,
  { filters, page }: ListQuery<ClosedDateFilters, ClosedDateSort>,
) {
  return closedDatesRepository.list(auth.tenantId, auth.venueIds, filters, page);
}

export async function get(auth: AuthContext, id: number) {
  const closedDate = await closedDatesRepository.findById(auth.tenantId, id, auth.venueIds);
  if (!closedDate) throw venueErrors.closedDateNotFound(id);
  return closedDate;
}

export function create(auth: AuthContext, input: CreateClosedDate) {
  return transaction(async () => {
    await checkNotPast(auth, input.venueId, input.date);
    return closedDatesRepository.insert(auth.tenantId, input);
  });
}

export function update(auth: AuthContext, id: number, input: UpdateClosedDate) {
  if (Object.keys(input).length === 0) return get(auth, id);
  return transaction(async () => {
    const closedDate = await get(auth, id);
    if (input.date !== undefined) await checkNotPast(auth, closedDate.venueId, input.date);
    const updated = await closedDatesRepository.update(auth.tenantId, id, auth.venueIds, input);
    if (!updated) throw venueErrors.closedDateNotFound(id);
    return updated;
  });
}

export function remove(auth: AuthContext, id: number) {
  return transaction(async () => {
    if (!(await closedDatesRepository.remove(auth.tenantId, id, auth.venueIds)))
      throw venueErrors.closedDateNotFound(id);
  });
}
