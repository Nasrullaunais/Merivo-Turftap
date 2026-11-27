# T49 Free times across resources

Status: todo · Stories: `BKG-01` (changed), supports `AST-01` · Depends on: T05 · Decisions: **D-43**

## Goal
One call answers "what's free on this date?" for a whole tenant, a venue or a sport, not just one resource. The Assistant (T36) needs it to answer "any court free tomorrow at 7?" in one step, and any future helper inside the platform can use the same call. The rules that decide what is free stay in one tested place: the API.

## Read first
- `docs/spec/bookings.md` (`BKG-01`), glossary "Slot", "Start Interval", "Price Rule".
- `apps/api/src/modules/bookings/availability.service.ts` and its tests; `packages/contract/src/bookings.ts` (`Slot`, `AvailabilityFilters`).
- `apps/api/src/modules/venues/resources.service.ts` (`list` already hides turned-off resources from customers and keeps venue-limited staff to their venues).
- `docs/architecture/api.md` (list filters, paging), `docs/architecture/tenancy.md`.

## Build
- `GET /v1/availability` filters: `date` (required, as now); `resourceId`, `venueId`, `type` (`ResourceType`), all optional and combinable; `free=true` lists only free slots; `from` and `to` (venue-local `HH:MM`) keep slots that start at or after `from` and before `to`; `slots` as now.
- Without `resourceId`: every active resource at an active venue of the caller's tenant that matches the filters, found through `resourcesService.list`, so tenant and venue limits are the ones already tested there. With `resourceId`: works exactly as today (the portal and console keep working unchanged).
- `slots=N` means N of each resource's own slot length.
- `Slot` gains `resourceId`, so a slot from a mixed list says which resource it's for.
- Sorted by `startsAt`, then `resourceId`; paging over the whole combined list. Load each resource's day in parallel.
- `bun run gen`; update `BKG-01` in the spec (the venue or sport case) and the availability row in `docs/architecture/api.md` if it lists filters.

## Done when
- Service tests: two venues, three resources of two types. One date with no filter lists all three; `venueId` and `type` narrow it; `free=true` drops booked, blocked and past slots; `from`/`to` bound the start times; a turned-off resource or venue is left out; `resourceId` alone gives the same list as before plus `resourceId`.
- Route tests: open without sign-in, customer, Assistant, staff; a venue-limited staff member sees only their venues' resources.
- Tenancy test: tenant B's resources never show up for tenant A, with and without filters.
- Portal and console tests still pass.
- `bun run check` passes.
