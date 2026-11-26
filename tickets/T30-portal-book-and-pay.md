# T30 Book, see how to pay, send receipt

Status: done · Stories: `BKG-02`, `PAY-01`, `PAY-02` · Depends on: T11, T28, T29

## Goal
From the slot list, a signed-in customer confirms a booking, sees the bank details, exact amount and time left, and uploads their Transfer Receipt.

## Read first
- `docs/spec/payments.md` (`PAY-01`, `PAY-02`), `docs/spec/bookings.md` (`BKG-02`).
- `docs/architecture/frontend.md` ("A mutation that makes several calls in a row": upload then attach).

## Build
- Confirm step: resource, date, time, price, amount to pay now (Advance or full).
- "Just taken" error → back to the slot list with a clear message.
- Pay page: bank name, branch, account name and number (copy buttons), amount, countdown to `expiresAt`.
- At a Pay at Venue venue: no pay page; show "Confirmed, pay at the venue" with the price.
- Receipt upload: JPG, PNG or PDF up to 5 MB, checked before upload; then `POST /v1/payments`. Shows "waiting for check" afterwards.

## Done when
- Component tests: confirm and pay page, a too-large file refused before upload, the "just taken" message.
- `bun run check` passes.
