# T47 Ask for series payments before each booking

Status: blocked (**OQ-01**) · Stories: `BKG-09` (changed) · Depends on: T15, T13, T46 · Decision: **D-09**

## Goal
For each repeat series booking, the customer gets a WhatsApp message N days before (the venue's series payment days) with the bank details and the Advance, and can pay by Transfer Receipt or cash.

## Read first
- `docs/spec/bookings.md` (`BKG-09`, updated), `docs/architecture/payments.md`.

## Build
- When a series is created (T15), queue one `ask-series-payment` job per booking at `startsAt - seriesPaymentDaysBefore` (venue setting copied onto the series). Skip at Pay at Venue venues, and for dates already inside that window (ask straight away instead).
- The job sends the template `seriesPaymentDue` only if the booking is still `CONFIRMED` and has a balance.
- Series bookings stay `CONFIRMED`, so a Transfer Receipt on one must work without the usual `AWAITING_PAYMENT → AWAITING_CHECK` move. Accept records the payment; reject tells the customer the reason.
- The Assistant (T38) and portal (T31) must list these bookings as "waiting for payment" for the customer.
- **What happens if it isn't paid in time waits on OQ-01**: don't build that part until the answer is in the spec.

## Done when
- Tests: jobs queued per booking with the right times, nothing at a Pay at Venue venue, the job does nothing for a cancelled or paid booking, a receipt on a series booking is accepted and the balance drops.
- `bun run check` passes.
