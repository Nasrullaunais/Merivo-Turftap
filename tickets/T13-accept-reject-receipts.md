# T13 Accept or reject a receipt

Status: done · Stories: `PAY-04`, `PAY-05` · Depends on: T12

## Goal
Staff accept a receipt (booking confirmed) or reject it with a reason (booking goes back to waiting for payment with a fresh time limit). The customer hears either way on WhatsApp.

## Read first
- `docs/spec/payments.md` (`PAY-04`, `PAY-05`), `docs/architecture/payments.md` (state diagram, "Receipt Check").

## Build
- Add `update` to the `payments` resource (T09 left it out).
- `payments.transitions.ts`: `PENDING_CHECK → ACCEPTED | REJECTED`, staff only. `rejectReason` required for `REJECTED`.
- Same transaction: accept → booking `AWAITING_CHECK → CONFIRMED`; reject → booking `AWAITING_CHECK → AWAITING_PAYMENT` with a fresh `expiresAt` (venue's current limit) and a new expiry job. The old expiry job is still queued, so the expiry handler must also check `expiresAt <= now`, not only the status.
- Templates `bookingConfirmed`, `receiptRejected` (with reason), queued in the same transaction.
- Written so T23 can reuse it for memberships (the payment points at a booking **or** a membership).

## Done when
- Tests: accept confirms, reject reopens with a new time limit and the old expiry job does nothing, two staff deciding at once (one gets `tt_sts_002`), customer can't PATCH a payment status.
- `bun run check` passes.

## Decided with the user (2026-11-24)
- Rejecting a receipt when the customer already has another booking waiting for payment cancels this booking, with the reject reason, instead of reopening it.
- A receipt on a booking cancelled before the check can still be accepted or rejected. Only the payment changes; no message is sent.
