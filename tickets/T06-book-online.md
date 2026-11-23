# T06 Book online, and expiry

Status: done · Stories: `BKG-02`, `BKG-03`, `PAY-01` · Depends on: T02, T04, T05, T46 · Decisions: **D-07**, **D-19** · Open question: **OQ-02**

## Goal
A customer (portal) or the Assistant books one or more back-to-back slots. The booking waits for payment, holds its slots for the venue's Payment Time Limit, and expires if no receipt arrives.

## Read first
- `docs/spec/bookings.md` (`BKG-02`, `BKG-03`), `docs/spec/payments.md` (`PAY-01`).
- `docs/architecture/payments.md` (whole page: amount due, settings copied onto the booking, the expiry job).
- `docs/architecture/backend.md` ("Status changes", "Background jobs").

## Build
- `bookings` resource: list, get, create, update (update is used from T07). `forCustomers`: list, get, create; customers and the Assistant see only their own bookings. Staff see bookings in their venues. Filters: `venueId`, `resourceId`, `customerId`, `status`, `from`, `to`.
- Create input: `resourceId`, `startsAt`, `slots` (count). The server checks every slot with the T05 function, works out the price, and sets `amountDue` (full price, or the Advance rounded **up** to whole rupees). It copies `expiresAt = now + Payment Time Limit` and the Cancellation Cut-off from the venue.
- The caller must have a customer record (from T02); without one, reply with a clear error the portal can act on.
- "Someone else booked it a moment earlier": map `bookings_no_overlap` with `constraintErrors()` to "That slot was just taken" (`BKG-02`).
- One booking waiting for payment per customer per tenant (**D-07**): a second online booking while one is `AWAITING_PAYMENT` is refused with a clear error. Booking again is allowed once the receipt is sent. Enforce it in the database (a partial unique index on `(tenant_id, customer_id) WHERE status = 'AWAITING_PAYMENT'`), not with "check first".
- **Pay at Venue** venue (**D-19**): the booking is `CONFIRMED` straight away, nothing is due online, no expiry job, no bank details in the reply. Whether such bookings need a limit too is **OQ-02**: leave it out until answered.
- Customers can book at most 30 days ahead (D-06, `BOOKING_HORIZON_DAYS`).
- Reply includes the venue's bank details and the amount due, so the portal and Assistant can show how to pay (`PAY-01`).
- Queue `expire-booking` at `expiresAt` in the same transaction. The handler moves `AWAITING_PAYMENT → EXPIRED` with a conditional UPDATE and notifies the customer (new template `bookingExpired`).
- Add `bookings` to `STAFF_RESOURCES` and `ROLE_PERMISSIONS`.

## Not in this ticket
Cancelling (T07). Receipts (T11). Walk-ins (T10). Any screen.

## Done when
- Service tests: price with and without Price Rules, Advance rounding, a slot off the grid refused, a past or closed slot refused, two customers racing for one slot (one gets the "just taken" error), expiry job does nothing if the booking already moved on.
- Route and tenancy tests; venue-scope tests for staff list and get.
- `bun run check` passes.
