# T18 Walk-in booking screen

Status: done · Stories: `BKG-04` · Depends on: T10, T17

## Goal
From the calendar, Front Desk taps a free slot, types a name and phone, picks "paid in cash" or "pay later", and the booking appears confirmed.

## Read first
- `docs/spec/bookings.md` (`BKG-04`); `apps/console/src/features/staff/AddStaffForm.tsx` (a phone-number form to copy).

## Build
- Feature `features/walk-ins/`: form in a dialog opened from an empty slot; number of slots (back-to-back); typing a phone finds an existing customer and fills the name.
- Shows the price before saving. "Just taken" error shown in the form.

## Done when
- Component tests: existing customer found by phone, pay later vs cash, the clash error shown.
- `bun run check` passes.
