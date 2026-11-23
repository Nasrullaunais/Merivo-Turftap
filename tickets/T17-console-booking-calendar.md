# T17 Booking calendar

Status: todo · Stories: `BKG-05` · Depends on: T14

## Goal
Staff see a day and a week calendar per venue, with every booking's state shown by colour **and** icon, and new bookings appearing without a refresh.

## Read first
- `docs/spec/bookings.md` (`BKG-05`), `docs/architecture/frontend.md` (whole page: time zones, colours with icons, pages over 300 lines split).
- `apps/console/src/features/blocked-times/` (a recent feature to copy), `packages/ui/src/time.ts`.

## Build
- Route `/calendar` with a venue picker (only the caller's venues). Day view: one column per resource, rows by slot. Week view: one resource, seven days.
- States: waiting for payment, waiting for receipt check, confirmed, blocked (Blocked Times). Closed Dates show as a closed day.
- Times in the venue's time zone (tests run in `America/New_York`).
- `useLiveUpdates()` (T14) keeps it fresh.
- Clicking an empty slot or a booking calls a prop the next tickets use (walk-in form T18, details panel T19). Here it can do nothing.
- Menu item and route permission in `config/routePermissions.ts`. Text in `i18n/en/calendar.ts`.
- Pick a calendar approach: a plain CSS grid is likely enough. A calendar library is a decision for the user (`AGENTS.md` → Decisions).

## Done when
- Component tests: a booking at 19:00 Colombo shows at 19:00 in a New York browser; each state shows its icon; a live event makes a new booking appear.
- `bun run check` passes.
