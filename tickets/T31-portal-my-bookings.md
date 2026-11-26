# T31 My bookings and memberships

Status: done · Stories: `POR-04`, `BKG-06` · Depends on: T30

## Goal
A customer sees upcoming and past bookings with their state, sends a receipt for one waiting for payment, and cancels before the cut-off. Memberships are listed too (once T23 exists).

## Build
- Page `/me`: upcoming and past bookings; state with colour and icon; "send receipt" reuses T30's upload; "cancel" with a confirm.
- After the cut-off, the cancel button is replaced by "contact the venue" with its phone number.
- Memberships section with dates and state; renew comes in T32.
- Bottom nav on phones (moved from T27, `POR-05`): Venues and My bookings, with the current page marked. On wider screens the same links sit in the top bar.

## Done when
- Component tests for cancel before and after the cut-off and for the receipt action.
- `bun run check` passes.
