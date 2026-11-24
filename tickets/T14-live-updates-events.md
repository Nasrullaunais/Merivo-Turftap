# T14 Live updates (`events`)

Status: done · Stories: part of `BKG-05`, `PAY-07` · Depends on: T06 · Decision: **D-11**

## Goal
The Staff Console updates without refreshing when a booking or payment changes.

## Read first
- `docs/architecture/api.md` (`events` row: events carry only a type and an id; the screen refetches).
- `docs/architecture/frontend.md` ("Data and errors").

## Build
- `events` resource, list only, staff only, as a Server-Sent Events stream (**D-11**). Events: `booking.changed`, `payment.changed` (later tickets may add `membership.changed`).
- Publish an event **after** the transaction commits, never inside it, so a rolled-back change sends nothing.
- A caller only gets events for their tenant and their venues.
- One API process in v1, so an in-memory event bus is enough. Write down in `docs/architecture/api.md` that a second API process would need Postgres `LISTEN/NOTIFY`.
- Console: one `useLiveUpdates()` hook in `lib/` that opens the stream (with the sign-in header) and invalidates the matching TanStack Query keys. Reconnects after a drop.

## Done when
- API tests: an event arrives after a booking is created; nothing after a rolled-back create; tenant B's staff get nothing; a limited Manager gets nothing from another venue.
- A console test shows a list refetching on an event.
- `bun run check` passes.
