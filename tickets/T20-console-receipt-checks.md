# T20 Receipt check queue and screen

Status: done · Stories: `PAY-03`, `PAY-04`, `PAY-05`, `PAY-06`, `PAY-07` · Depends on: T13, T14

## Goal
One list of receipts waiting for a check, oldest first, with the count in the sidebar. Opening one shows the image, the AI summary, any reused-receipt warning, and accept or reject buttons.

## Read first
- `docs/spec/payments.md` (all), `docs/architecture/payments.md`.

## Build
- Feature `features/receipts/`: queue page (`GET /v1/payments?status=PENDING_CHECK&sort=createdAt,asc`), live through `useLiveUpdates()`; sidebar badge with the count.
- Check screen: receipt image or PDF (`receiptUrl`), booking amount due vs read amount, date, bank, reference, each flag as text plus icon; "Couldn't read this receipt" when unreadable; reused warning with a link to the earlier booking.
- Accept; reject with a required reason.

## Done when
- Component tests: oldest first, badge count, unreadable message, duplicate warning link, reject needs a reason.
- `bun run check` passes.
