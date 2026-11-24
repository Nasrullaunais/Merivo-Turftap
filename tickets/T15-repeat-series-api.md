# T15 Repeat series API

Status: done · Stories: `BKG-09` · Depends on: T10 · Decisions: **D-09**, **D-10**

## Goal
Staff book the same resource and time every week for a number of weeks, all up front, and can cancel one booking or the rest of the series.

## Read first
- `docs/spec/bookings.md` (`BKG-09`), glossary "Repeat Series".

## Build
- Table `repeat_series` (`tenantId`, `resourceId`, `customerId`, weekday, start time, slots, weeks, `status`); `bookings.repeatSeriesId` (nullable).
- `repeat-series` resource: list, get, create, update. Create takes the walk-in fields (T10) plus `firstDate`, `weeks`, and optional `skipDates`.
- Clashes (**D-10**): any week that isn't free (booked, blocked, closed) → 409 listing every clashing date; nothing is saved. Resending with those dates in `skipDates` saves the rest.
- Bookings are created in one transaction as `CONFIRMED` (**D-09**). Copy the venue's series payment days and Advance onto the series; asking for the payment before each booking is T47.
- `PATCH /v1/repeat-series/:id { status: "CANCELLED", cancelReason }` cancels every future booking in it. One booking is cancelled through `PATCH /v1/bookings/:id` as usual.
- Permissions from `api.md` (`repeat-series`: Front Desk read only).

## Done when
- Tests: 8 weeks with one clash replies 409 naming the date; with `skipDates` 7 bookings are made; cancelling the series leaves past bookings alone.
- `bun run check` passes.
