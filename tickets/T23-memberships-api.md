# T23 Memberships API: buy, sell, renew

Status: done · Stories: `MEM-02`, `MEM-03`, `MEM-04` · Depends on: T13, T22 · Decision: **D-08** · Open question: **OQ-03**

## Goal
A customer buys a membership online and pays with a Transfer Receipt; Front Desk sells one at the desk for cash; a customer renews early and the new one starts the day after the current one ends.

## Read first
- `docs/spec/memberships.md`, `docs/architecture/payments.md` ("Memberships use the same states, with `ACTIVE` in place of `CONFIRMED`").
- The bookings and payments code from T06, T09, T11 and T13: memberships reuse the same steps.

## Build
- Table `memberships`: `tenantId`, `planId`, `customerId`, `startsOn`, `endsOn` (venue-local dates), `status` (per **D-08**), price and `amountDue` copied from the plan, `expiresAt`.
- `memberships` resource: list, get, create, update. `forCustomers`: list, get, create, update (cancel own).
- Online: `startsOn` today or later (venue's time zone); `endsOn` from the plan length; waits for payment with the venue's Payment Time Limit, then expires like a booking.
- Renew: if the customer has an `ACTIVE` membership of the same plan, `startsOn` = the day after it ends (`MEM-04`).
- Desk sale (`MEM-03`): staff create with name, phone and `CASH` or `PAY_LATER`; `ACTIVE` straight away. Reuse the `walkIn` object from `CreateBooking` (T10).
- `payments.membershipId` (a payment points at a booking **or** a membership, a check constraint makes sure of exactly one). Receipt send, accept and reject (T11, T13) now work for memberships too. Templates `membershipActive`, `membershipExpired`.
- States (D-08): `EXPIRED` means not paid in time, like bookings; `ENDED` means the end date passed (already written in `docs/architecture/payments.md`).
- Buying online at a Pay at Venue venue: **OQ-03**. Until answered, refuse it with a clear error ("buy this at the desk").

## Done when
- Tests: end date from days and from months (31 Jan + 1 month), renew starts the day after, unpaid membership expires, accepted receipt makes it `ACTIVE`, desk cash sale, tenancy and venue-scope tests.
- `bun run check` passes.
