# T11 Send a Transfer Receipt

Status: done · Stories: `PAY-02` · Depends on: T09

## Goal
A customer uploads a photo, screenshot or PDF of their bank transfer. The booking stops expiring and waits for a Receipt Check.

## Read first
- `docs/spec/payments.md` (`PAY-02`), `docs/architecture/payments.md` ("Flow").
- `docs/architecture/api.md` (`files` row: "Get arrives with receipts").
- `apps/api/src/modules/files/` (upload, first-bytes check), `docs/adr/0012-files-in-cloudflare-r2.md`.

## Build
- New file purpose `RECEIPT`: JPG, PNG or PDF, up to 5 MB, checked by first bytes. Receipts are private: only the uploader, the Assistant for that customer, and staff of that venue may open one.
- `POST /v1/payments { kind: "TRANSFER", bookingId, fileId }` by a customer, the Assistant or staff. Status `PENDING_CHECK`. Amount = the booking's amount due.
- In the same transaction, booking `AWAITING_PAYMENT → AWAITING_CHECK` with a conditional UPDATE, so a receipt at the last second and the expiry job can't both win.
- Store a SHA-256 hash of the file's bytes (for T12, **D-13**). Built on the file row (`files.sha256`), which the payment points at through `fileId`.
- Queue a `read-receipt` job (handler body comes in T12; here it can be an empty handler or left out). Left out: T12 adds the job and queues it in `payments.service` `sendTransferReceipt`.
- Payment item has a short-lived `receiptUrl` for those allowed to see it.

## Done when
- Tests: receipt after expiry refused, receipt moves booking to `AWAITING_CHECK` and the expiry job then does nothing, another customer's booking 404, a renamed `.exe` refused, a PDF accepted.
- `bun run check` passes.
