# T09 Payments: cash and refunds

Status: done · Stories: `PAY-08`, `BKG-08` · Depends on: T07

## Goal
The `payments` module exists. Front Desk records cash paid at the venue, and a Manager records a refund on a cancelled booking. Each booking shows how much is paid and what is left.

## Read first
- `docs/architecture/payments.md` ("Payments" table), `docs/spec/payments.md` (`PAY-08`), `docs/spec/bookings.md` (`BKG-08`).

## Build
- Module `apps/api/src/modules/payments/` (area `pay`). Table `payments`: `tenantId`, `bookingId` (nullable; `membershipId` is added in T23), `kind` (`TRANSFER`, `CASH`, `REFUND`), `status` (`PENDING_CHECK`, `ACCEPTED`, `REJECTED`), `amount` (cents, negative for refunds), `note`, `createdBy`, timestamps. Venue scope through the booking's resource.
- `payments` resource: list, get, create. (`update` waits for T13: cash and refunds never change once saved.) This ticket handles `kind: CASH` and `kind: REFUND`; both are `ACCEPTED` straight away.
- `REFUND` only on a `CANCELLED` booking, only by Owner or Manager (a service rule: Front Desk holds `payments:create` for cash), and not more than what was paid.
- `CASH` only on a `CONFIRMED` booking with a balance left (`PAY-08`), and not more than the balance.
- The booking item gains `paid` and `balance` (Money), worked out from accepted payments.
- Permissions for `payments` from the table in `api.md`.

## Not in this ticket
`TRANSFER` (T11). Screens (T19).

## Done when
- Tests: cash clears the balance, too much cash refused, Front Desk refund refused with 403, refund on a confirmed booking refused, venue-scope and tenancy tests.
- `bun run check` passes.
