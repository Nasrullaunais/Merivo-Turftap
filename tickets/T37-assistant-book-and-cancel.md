# T37 Book and cancel through chat

Status: todo · Stories: `AST-02`, `AST-04` · Depends on: T36, T07

## Goal
The Assistant repeats venue, resource, date, time and price, waits for "yes", then books in a fixed step and sends bank details, amount and time limit. The same for cancelling before the cut-off.

## Build
- The agent returns a structured "customer confirmed" answer naming the exact resource, start time, slots and price. Only then a fixed n8n step calls `POST /v1/bookings` or `PATCH /v1/bookings/:id`. The AI never calls a write route.
- If the price the API returns differs from what the customer confirmed, don't book; ask again.
- After booking: bank details, amount due, time limit. At a Pay at Venue venue: "confirmed, pay at the venue".
- The customer can cancel a booking waiting for payment at any time (D-07), with the same "yes" confirmation. A confirmed booking after the cut-off: the venue's phone number.

## Done when
- Checklist: book after "yes", nothing booked without "yes", "just taken" handled, cancel after the cut-off refused politely.
- `bun run check` passes.
