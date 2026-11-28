# T39 Gemini receipt reader adapter

Status: done · Stories: `PAY-03` · Depends on: T12

## Goal
Receipts are read by Gemini in production, behind the existing `ReceiptReader` port.

## Read first
- `docs/architecture/adapters.md`, `apps/api/src/ports/receipt-reader.ts`, `apps/api/src/adapters/object-storage/s3/` (a real adapter to copy).

## Build
- `adapters/receipt-reader/gemini/` using `@google/genai` (latest stable), structured output matching `ReceiptReading`. Images and PDFs.
- Config `RECEIPT_READER=gemini`, `GEMINI_API_KEY`, model name as a setting. Errors become "unreadable"; only timeouts and 5xx are retried.
- `read` never rejects (the port says so, and the `read-receipt` job doesn't catch): every error ends as `undefined`.
- Passes `ports/receipt-reader.contract-test.ts` (T12) when `TEST_GEMINI_API_KEY` is set, with 3 sample receipts kept in the repo (made-up data, no real bank details). Call `receiptReaderContract` once per sample.

## Done when
- Contract test passes against Gemini locally (you need a key); `bun run check` passes without one.
