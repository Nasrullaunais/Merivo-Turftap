# T16 Booking reminders

Status: todo · Stories: `BKG-10` · Depends on: T10, T13

## Goal
A customer gets a WhatsApp reminder 3 hours before a confirmed booking.

## Read first
- `docs/spec/bookings.md` (`BKG-10`), `docs/architecture/payments.md` ("Scheduled jobs").

## Build
- `BOOKING_REMINDER_HOURS = 3`. When a booking becomes `CONFIRMED` (receipt accepted, walk-in, series), queue `booking-reminder` at `startsAt - 3h` in the same transaction.
- No reminder if that time has already passed when the booking is confirmed.
- The handler sends only if the booking is still `CONFIRMED` (template `bookingReminder`: venue, resource, local time).

## Done when
- Tests: queued on confirm, skipped for a booking 2 hours away, handler does nothing for a cancelled booking.
- `bun run check` passes.
