# T21 Repeat series screen

Status: todo · Stories: `BKG-09` · Depends on: T15, T18

## Goal
From the walk-in form, staff choose "repeat weekly for N weeks", see the clashing dates, skip them or give up, and later cancel one booking or the rest of the series.

## Build
- Extend the walk-in dialog (T18) with a repeat option. Features never import each other, so anything both `walk-ins` and `bookings` need moves to `components/`.
- On a 409 with clashing dates: list them with "Skip these dates and book the rest" and "Cancel".
- In the booking details panel (T19): "Cancel the rest of the series" for a series booking.

## Done when
- Component tests for the clash list and for cancelling the rest.
- `bun run check` passes.
