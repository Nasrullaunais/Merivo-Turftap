# T48 Slot length and Start Interval per resource

Status: todo · Stories: `VEN-04`, `VEN-05` (changed) · Depends on: none · Decisions: **D-20**, **D-21**

## Goal
Each resource says how long one slot is and how often a booking may start, and its Price Rules fit those start times. Free slots (T05) are built on this.

## Read first
- `docs/spec/venues-and-resources.md` (`VEN-04`, `VEN-05`, updated), glossary "Slot", "Start Interval", "Price Rule".
- The `VEN-04` and `VEN-05` commits (`7f2f142`, `1e2585d`): `packages/contract/src/resources.ts` (today any multiple of 15 up to 240), `price-rules.ts`, console `features/resources/`, `features/price-rules/`, the seed script.

## Build
- Slot length: only 15, 30 or 60 minutes. A migration with a check constraint; existing rows that don't fit are changed to the nearest allowed value in the migration (only demo data exists).
- New `startIntervalMinutes`: 15, 30 or 60, default 30, and not longer than the slot length (a 15-minute slot starting every 30 minutes would leave gaps).
- Price Rule start and end times must sit on the resource's Start Interval (a 60-minute interval: whole hours only). Changing a resource's Start Interval is refused while one of its Price Rules doesn't fit, naming the rule.
- Console: both settings on the resource form as a choice of three; Price Rule time inputs offer only times on the interval.
- Seed data: futsal courts 60-minute slots starting every 30 minutes; pool tables 30 and 30.

## Done when
- Contract, service and component tests: 45-minute slot refused, interval longer than slot refused, a Price Rule at 18:15 refused on a 30-minute interval, interval change refused with the clashing rule named.
- `bun run check` passes.
