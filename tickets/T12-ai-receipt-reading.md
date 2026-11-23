# T12 AI reads receipts, reused-receipt warning

Status: todo · Stories: `PAY-03`, `PAY-06` · Depends on: T11 · Decisions: **D-12**, **D-13**

## Goal
Each receipt is read by the AI in the background. Staff see a summary (amount matches, date recent, reference new) and a warning when the same receipt was used before in the tenant.

## Read first
- `docs/spec/payments.md` (`PAY-03`, `PAY-06`), `docs/architecture/payments.md` ("AI reading never changes a status").
- `apps/api/src/ports/receipt-reader.ts` and its fake adapter.

## Build
- `read-receipt` job, queued in `payments.service` `sendTransferReceipt` in the same transaction (T11 left it out): `ports().receiptReader.read(file)`, save the reading on the payment as `receiptReading` (`amount`, `paidOn`, `bank`, `reference`, or `unreadable: true`).
- Summary flags on the payment item: `amountMatches`, `dateRecent` (**D-12**), `referenceNew`.
- Duplicates (**D-13**): a payment in the same tenant whose receipt file has the same hash (`files.sha256`, saved by T11) or the same reference → `duplicateOf: { paymentId, bookingId }`. A warning only; it never blocks.
- The job handler is an edge, so it may catch a reader failure and save "unreadable".
- Add a port contract test (`ports/receipt-reader.contract-test.ts`) the fake passes and T39's Gemini adapter will pass.

## Done when
- Tests with the fake reader's set answers: match, mismatch, unreadable, duplicate by hash, duplicate by reference across two venues in one tenant, no duplicate across tenants.
- `bun run check` passes.
