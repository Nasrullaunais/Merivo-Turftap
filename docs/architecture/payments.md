# Bookings, payments and receipt checks

How money and slot holds work in v1 ([ADR 0007](../adr/0007-bank-transfer-with-ai-check.md)). Stories: `BKG-*`, `PAY-*`, `MEM-*`.

## Booking states

```mermaid
stateDiagram-v2
  [*] --> AWAITING_PAYMENT: online booking
  [*] --> CONFIRMED: walk-in booking
  AWAITING_PAYMENT --> AWAITING_CHECK: transfer receipt sent
  AWAITING_PAYMENT --> EXPIRED: time limit passed
  AWAITING_CHECK --> CONFIRMED: receipt accepted
  AWAITING_CHECK --> AWAITING_PAYMENT: receipt rejected (fresh time limit)
  AWAITING_PAYMENT --> CANCELLED
  AWAITING_CHECK --> CANCELLED
  CONFIRMED --> CANCELLED
```

Memberships use the same states, with `ACTIVE` in place of `CONFIRMED`. Memberships also have `EXPIRED` once their end date passes.

**Holding slots:** `AWAITING_PAYMENT`, `AWAITING_CHECK` and `CONFIRMED` hold their slots. Postgres itself refuses two holding bookings that overlap on one resource:

```sql
ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (resource_id WITH =, tstzrange(starts_at, ends_at) WITH &&)
  WHERE (status IN ('AWAITING_PAYMENT', 'AWAITING_CHECK', 'CONFIRMED'));
```

Blocked times and closed dates are checked by the service when booking, and the booking itself refuses to overlap them.

## Payments

A booking or membership has a list of **payments**. Each payment has a `kind` and an `amount` in cents:

| Kind | Made by | Status |
|---|---|---|
| `TRANSFER` | Customer, with a transfer receipt file | `PENDING_CHECK` → `ACCEPTED` or `REJECTED` |
| `CASH` | Front Desk | `ACCEPTED` straight away |
| `REFUND` | Manager, as a record only (negative amount) | `ACCEPTED` straight away |

A **Receipt Check** is staff PATCHing a `TRANSFER` payment to `ACCEPTED` or `REJECTED` (`rejectReason` required). In the same transaction, the service moves the booking forward or back.

## Flow

```mermaid
sequenceDiagram
  actor C as Customer
  participant API
  participant J as Jobs (pg-boss)
  participant AI as ReceiptReader (Gemini)
  actor S as Staff
  C->>API: POST /v1/bookings
  API->>J: queue "expire booking" for the time limit (same transaction)
  API-->>C: bank details + amount due
  C->>API: POST /v1/files (receipt), then POST /v1/payments { kind: TRANSFER, fileId }
  API->>J: queue "read receipt" (same transaction)
  J->>AI: read the image
  J->>API: save the reading + duplicate check on the payment
  S->>API: PATCH /v1/payments/:id { status: ACCEPTED }
  API->>J: queue "notify customer" (same transaction)
```

- **Amount due now** = the full price, or the venue's advance percentage rounded up to whole rupees. It's fixed when the booking is created.
- **Duplicates:** each receipt stores its image hash and the reference number the AI read. A match on either one, inside the same tenant, shows a warning (`PAY-06`). It's a warning, not a block: staff decide.
- **AI reading** never changes a status. It only fills `receiptReading` (amount, date, bank, reference, plus "matches" flags) for staff to see.
- **Jobs are queued inside the same transaction** as the data, so a job can never run for a booking that didn't save.
- The expiry job uses a conditional UPDATE (`WHERE status = 'AWAITING_PAYMENT'`), so a receipt arriving at the last second wins cleanly.

## Scheduled jobs

| Job | When | Does |
|---|---|---|
| Expire booking | At the time limit | `AWAITING_PAYMENT` → `EXPIRED`, notify |
| Booking reminder | 3 hours before start | WhatsApp reminder |
| Expire memberships | Daily, 00:05 Colombo time | `ACTIVE` past end date → `EXPIRED` |
| Membership reminder | Daily | WhatsApp 3 days before end |

Each job checks the row's current state when it runs and does nothing if things have moved on.
