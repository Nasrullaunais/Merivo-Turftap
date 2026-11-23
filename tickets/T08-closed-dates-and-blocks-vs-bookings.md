# T08 Closed Dates and Blocked Times meet bookings

Status: todo · Stories: `VEN-02`, `VEN-07` (the parts left "built with bookings") · Depends on: T06

## Goal
Finish the two venue stories that were waiting for bookings.

## Read first
- `docs/spec/venues-and-resources.md` (`VEN-02`, `VEN-07` last criteria).
- `apps/api/src/modules/venues/blocked-times.service.ts`, `closed-dates.service.ts`; console `features/closed-dates/`, `features/blocked-times/`.

## Build
- **Blocked Time:** creating or moving one over a holding booking is refused; the error names the booking (start time and customer name). The venues service asks the bookings service; watch for an import circle (see "If two modules need each other" in `backend.md`).
- **Closed Date:** the console first lists holding bookings on that date (`GET /v1/bookings?venueId=&from=&to=`) and asks the Manager to confirm before saving. The API does not refuse the close; staff contact those customers.
- Console: the confirm step on the close-a-day form; the clash message on the block form.

## Done when
- API tests for the Blocked Time clash; component tests for the confirm step (console tests run in `America/New_York`).
- `bun run check` passes.
