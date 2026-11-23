# T24 Memberships screens in the console

Status: todo · Stories: `MEM-03`, `PAY-04` (for memberships) · Depends on: T23

## Goal
Staff see a venue's memberships (filter by status), sell one at the desk, and check membership receipts in the same receipt queue as bookings.

## Build
- Feature `features/memberships/`: list with status, customer, plan, dates; "sell membership" dialog (phone lookup like the walk-in form, plan, start date, cash or pay later).
- Receipt queue and check screen (T20) show membership receipts too, with the plan instead of the resource.
- Text in `i18n/en/memberships.ts`.

## Done when
- Component tests for the desk sale and a membership receipt in the queue.
- `bun run check` passes.
