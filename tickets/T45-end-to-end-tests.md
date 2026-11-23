# T45 End-to-end journeys (Playwright + axe)

Status: todo · Stories: `POR-05` · Depends on: T30, T20

## Goal
A few key journeys are tested in a real browser at phone width, with axe checking contrast and accessibility.

## Read first
- `docs/architecture/testing.md`, `docs/architecture/frontend.md` (WCAG AA).

## Build
- Playwright set-up for both apps against the API with fake adapters and a seeded tenant.
- Journeys: customer browses, signs in, books, uploads a receipt (portal, 360 px wide); Front Desk accepts the receipt and the booking turns confirmed (console); walk-in booking from the calendar.
- axe on every page the journeys visit.
- Run in CI.

## Done when
- The journeys pass locally and in CI.
