# T05 Bookings table and free slots

Status: done · Stories: `BKG-01` · Depends on: T01, T48 · Decisions: **D-05**, **D-06**, **D-20**, **D-21**

## Goal
`GET /v1/availability?resourceId=&date=` lists the slots of one resource on one date, each with its price and whether it's free. It is open without sign-in (`POR-02`). The bookings table exists so "already booked" can be checked.

## Read first
- `docs/spec/bookings.md` (`BKG-01`), `docs/architecture/payments.md` (states, the `bookings_no_overlap` constraint).
- `docs/architecture/api.md` ("Computed and special resources").
- `apps/api/migrations/0004_price_rules_no_overlap.sql` (how a hand-written `EXCLUDE` migration looks).
- `apps/api/src/modules/venues/price-rules.service.ts`, `closed-dates.service.ts`, `blocked-times.service.ts` (what this reads, through the venues service).

## Build
- Module `apps/api/src/modules/bookings/`. Table `bookings`: `tenantId`, `resourceId`, `customerId`, `startsAt`, `endsAt`, `status` (enum from `payments.md`), `source` (`ONLINE`, `WALK_IN`), price (`priceColumns`), `amountDue`, `expiresAt`, `cancellationCutOffHours`, `cancelReason`, `createdBy`, timestamps. Indexes on tenant and on `(resource_id, starts_at)`.
- Hand-written migration with `bookings_no_overlap` exactly as in `payments.md`.
- `availability` resource, list only, public and `forCustomers`. Filters `resourceId`, `date` (venue's local date). Each slot: `startsAt`, `endsAt`, `price` (Money), `free` (boolean).
- Free means: inside opening hours, not on a Closed Date, not in a Blocked Time, not overlapping a holding booking, not in the past, resource and venue active, and within the booking horizon (**D-06**).
- Start times (**D-05**, **D-20**): on the clock, every Start Interval of the resource (T48), whatever the opening time. With a 30-minute Start Interval, a venue opening at 06:15 takes its first booking at 06:30. A booking is a whole number of slots and must end by closing time. Each listed start time is free if one slot from there is free.
- Price (**D-05**): each Start Interval part costs its share of the slot price in force then. With LKR 2,000 an hour by default, LKR 3,000 an hour from 18:00 and a 30-minute Start Interval, 17:30–18:30 costs LKR 2,500. Round the total to whole rupees.
- Put the start times and pricing in one service function that T06 reuses, so the booking check and the list never disagree.
- Venue scope: a limited staff caller asking about another venue's resource gets 404. Add `bookings.venue-scope.test.ts` (architecture rule 13).

## Not in this ticket
Creating bookings (T06). Tests insert booking rows through the repository.

## Done when
- Service tests cover each "not free" reason, a Price Rule price vs default price, and a date in the venue's time zone across UTC midnight.
- A test proves the database refuses two overlapping holding bookings, and allows overlap with a `CANCELLED` one.
- `bun run check` passes.
