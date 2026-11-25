# T25 Check-ins (API + console)

Status: done · Stories: `MEM-05` · Depends on: T23

## Goal
Front Desk searches a customer by phone and taps "check in". An expired or unpaid membership stops them, with the reason shown.

## Read first
- `docs/spec/memberships.md` (`MEM-05`), glossary "Check-in".

## Build
- Table `check_ins`: `tenantId`, `membershipId`, `venueId`, `checkedInAt`, `createdBy`.
- `check-ins` resource: list, create. Create takes `membershipId`; allowed only if the membership is `ACTIVE` and today (venue's time zone) is between `startsOn` and `endsOn`. Distinct errors: not paid yet, ended, not started yet.
- Console: a check-in page with phone search, the customer's memberships at this venue, and a "check in" button; today's check-ins list.

## Decided with the user (D-29, D-30, D-31)
- A Balance still owed refuses the check-in; the card offers **Take cash** right there.
- Each venue has a setting, "Allow more than one check-in a day" (`repeatCheckIns`, on by default). When off, a second check-in that day is refused.
- A check-in can be undone (`DELETE`) for 5 minutes, also by Front Desk.

## Done when
- API tests for each refusal reason and venue scope; component test for the search and the refusal message.
- `bun run check` passes.
