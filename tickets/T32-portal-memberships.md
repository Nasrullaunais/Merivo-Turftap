# T32 Buy and renew a membership

Status: todo · Stories: `MEM-02`, `MEM-04` · Depends on: T23, T31

## Goal
A customer picks a venue's plan and a start date, pays by transfer like a booking, and can renew early from "My bookings and memberships".

## Build
- Plans on the venue page (T28), with price and length.
- Buy: start date today or later, shows the end date, then the same pay page and receipt upload as bookings.
- Renew button on an active membership: start date fixed to the day after it ends.

## Done when
- Component tests for buy and renew, and for the end date shown.
- `bun run check` passes.
