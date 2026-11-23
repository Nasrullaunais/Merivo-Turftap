# T19 Booking details: cancel, cash, refund

Status: todo · Stories: `BKG-07`, `PAY-08`, `BKG-08` · Depends on: T17

## Goal
Clicking a booking in the calendar opens its details: customer, times, price, paid and balance, payments list. From there staff cancel with a reason, record cash for the balance, or (Manager) record a refund on a cancelled booking.

## Read first
- `docs/spec/bookings.md` (`BKG-07`, `BKG-08`), `docs/spec/payments.md` (`PAY-08`), `docs/architecture/frontend.md`.

## Build
- Feature `features/bookings/`: details panel, cancel dialog (reason required), "mark balance paid in cash", "record refund" (amount + note, Manager and Owner only; hidden for Front Desk through permissions from `/v1/me`).
- After a change the calendar refetches.

## Done when
- Component tests for each action and for Front Desk not seeing "record refund".
- `bun run check` passes.
