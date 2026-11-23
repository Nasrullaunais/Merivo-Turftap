# T07 Cancel bookings

Status: todo · Stories: `BKG-06`, `BKG-07` · Depends on: T06

## Goal
A customer cancels before the Cancellation Cut-off; staff cancel any booking with a reason. The slots become free again and the customer gets a WhatsApp message.

## Read first
- `docs/spec/bookings.md` (`BKG-06`, `BKG-07`), `docs/architecture/api.md` ("Status changes go through PATCH"), `apps/api/src/lib/resource/transitions.ts`.

## Build
- `bookings.transitions.ts` with the cancel rows from `payments.md`.
- `PATCH /v1/bookings/:id { status: "CANCELLED", cancelReason }`. `cancelReason` is required for staff, optional for customers.
- A booking still `AWAITING_PAYMENT` can be cancelled by the customer or the Assistant at any time, even after the cut-off: nothing has been paid (D-07).
- A `CONFIRMED` booking after the cut-off copied onto it: refuse the customer or Assistant with an error whose message includes the venue's phone number (`BKG-06`).
- Template `bookingCancelled` with the reason; sent when staff cancel. (A customer cancelling their own booking gets no message.)
- `forCustomers` adds `update`, limited to cancelling their own booking.

## Done when
- Tests: cancel before and after the cut-off, Front Desk cancels with reason and the message is queued, a cancelled booking's slot can be booked again, two cancels at once (one gets `tt_sts_002`).
- `bun run check` passes.
