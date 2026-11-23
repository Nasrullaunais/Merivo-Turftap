# T28 Browse venues, resources and free slots

Status: todo · Stories: `POR-02`, `BKG-01` · Depends on: T05, T27

## Goal
Without signing in, a customer sees the tenant's venues (cover photo first), a venue's resources with photos and prices, and the free slots of a resource on a chosen date.

## Read first
- `docs/spec/customer-portal.md` (`POR-02`), `docs/spec/bookings.md` (`BKG-01`), `docs/spec/venues-and-resources.md` (`VEN-06` cover photo).
- `apps/portal/src/features/venues/` (current venue list and cover photo).

## Build
- Routes: venue list `/`, venue page `/venues/$venueId`, resource page `/resources/$resourceId` with a date picker (today and the booking horizon, D-06) and the slot list from `GET /v1/availability`.
- Prices with `formatMoney`, no decimals. Times in the venue's time zone.
- Picking slots (back-to-back only) leads to "Book", which asks for sign-in (T29, T30). Here the button can lead to a placeholder.
- Closed Dates show as "Closed" with the reason.

## Done when
- Component tests: free and taken slots, a Price Rule price, a closed day with its reason, a New York browser still sees Colombo times.
- `bun run check` passes.
