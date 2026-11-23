# T10 Walk-in booking API

Status: done · Stories: `BKG-04` · Depends on: T09

## Goal
Staff book for someone at the desk or on the phone. The booking is confirmed straight away.

## Read first
- `docs/spec/bookings.md` (`BKG-04`), `docs/architecture/payments.md` (walk-in goes straight to `CONFIRMED`).

## Build
- Staff `POST /v1/bookings` with `customerName`, `customerPhone` and `payment: "CASH" | "PAY_LATER"` instead of a signed-in customer. `customersService.findOrCreateByPhone` (T01) reuses an existing customer.
- Status `CONFIRMED`, `source: WALK_IN`, no expiry job. `CASH` records a cash payment for the full price in the same transaction (T09).
- Staff can book any slot the free-slot check allows, including later today. The booking horizon (D-06) applies to customers only.
- The create schema stays one schema with two shapes (customer vs staff); keep it readable in OpenAPI. Built as one optional `walkIn` object (`customerName`, `customerPhone`, `payment`): a union of two schemas turned a walk-in with a blank name into an online booking and lost the field names in errors.

## Done when
- Tests: existing customer reused (name unchanged), new customer created, cash booking shows balance 0, pay-later shows the full balance, slot clash gives the same "just taken" error.
- `bun run check` passes.
