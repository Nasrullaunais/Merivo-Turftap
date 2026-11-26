# T29 Portal sign-in and first-booking name

Status: done · Stories: `POR-03` · Depends on: T02, T27

## Goal
A customer signs in when they book, gives their name once, and a customer record is created for this tenant. Someone who already booked through the Assistant with the same phone sees their earlier bookings.

## Read first
- `docs/spec/customer-portal.md` (`POR-03`), `docs/architecture/frontend.md` ("Sign-in in the console": the same test form approach until Auth0 exists).
- `apps/console/src/features/sign-in/` (the test sign-in form to copy into the portal).

## Build
- `lib/auth` in the portal: test sign-in form storing `fake:<phone>` (works only with `AUTH_PROVIDER=fake`), token in `sessionStorage`. T42 swaps in Auth0.
- After sign-in: look up the customer's own record; none → ask for a name and `POST /v1/customers`.
- Return to the page the customer was on.

## Done when
- Component tests: first sign-in asks for the name once; a returning customer isn't asked.
- `bun run check` passes.
