# T46 Venue payment settings: Pay at Venue, 20-minute default, series payment days

Status: done · Stories: `VEN-03` (changed) · Depends on: none · Decisions: **D-09**, **D-18**, **D-19**

## Goal
Three additions to the venue payment settings built in `VEN-03`, needed before online booking (T06).

## Read first
- `docs/spec/venues-and-resources.md` (`VEN-03`, updated), glossary "Pay at Venue", "Payment Time Limit", "Repeat Series".
- The `VEN-03` commit (`bb039f6`): `packages/contract/src/venues.ts`, `venues.tables.ts`, console `features/venues/PaymentSettings.tsx`.

## Build
- **Pay at Venue** switch (`payAtVenue`, default off). When on, bank details and the Advance aren't needed; the console hides them.
- Default **Payment Time Limit** becomes 20 minutes (`DEFAULT_PAYMENT_TIME_LIMIT_MINUTES`) for new venues. Existing venues keep their value: the migration changes only the column default.
- **Series payment days** (`seriesPaymentDaysBefore`, default 2, 1 to 7): how many days before each repeat series booking the Advance is asked for (T47).
- Only Owners change these; Managers and Front Desk see them (same as today).

## Done when
- Contract, route and component tests for the new fields, including the range limits and hidden bank fields when Pay at Venue is on.
- `bun run check` passes.
