# Tickets

The rest of TurfTap v1, broken into tickets. Each ticket is sized so one agent can finish it in one session (about 250k tokens of context): one story or one slice of a story, like the existing `VEN-07` commit.

## How to use

- Pick the lowest-numbered ticket whose **Depends on** tickets are all `done`.
- Read the ticket, then the docs it lists under **Read first**. `AGENTS.md` always applies.
- One ticket = one branch = one pull request. Name the branch after the ticket (`t06-book-online`).
- When it merges, set its status to `done` here and in the ticket file.
- Open decisions are marked **D-xx** in tickets and listed below. Don't build past an open decision: settle it with the user first, then record the answer here and in the docs it changes.

Status: `todo`, `doing`, `done`, `blocked` (waiting on a decision or an outside setup).

## Already built

`SIG-01` to `SIG-06`, `VEN-01` to `VEN-07`. Still open from those: the real WhatsApp, SMS and Auth0 connections (T40, T41, T42). Only fakes exist for those today.

## Tickets

| # | Ticket | Stories | Depends on | Status |
|---|---|---|---|---|
| **A. Customers** |||||
| [T01](T01-customers-api.md) | Customers API | supports BKG-04, MEM-05, POR-03 | | done |
| [T02](T02-customer-and-assistant-callers.md) | Customer and Assistant callers on the API | POR-03, AST-05 | T01 | done |
| **B. Messages** |||||
| [T03](T03-whatsapp-numbers-api.md) | WhatsApp numbers: link script and Assistant lookup | PLA-02 | | done |
| [T04](T04-notifications-module.md) | Notifications module | AST-07 | T01, T03 | done |
| **C. Bookings and payments (API)** |||||
| [T46](T46-venue-payment-settings-2.md) | Venue payment settings: Pay at Venue, 20-minute default, series payment days | VEN-03 | | done |
| [T48](T48-slot-length-and-start-interval.md) | Slot length and Start Interval per resource | VEN-04, VEN-05 | | done |
| [T05](T05-bookings-table-and-free-slots.md) | Bookings table and free slots | BKG-01 | T01, T48 | done |
| [T06](T06-book-online.md) | Book online, and expiry | BKG-02, BKG-03, PAY-01 | T02, T04, T05, T46 | done |
| [T07](T07-cancel-bookings.md) | Cancel bookings | BKG-06, BKG-07 | T06 | done |
| [T08](T08-closed-dates-and-blocks-vs-bookings.md) | Closed Dates and Blocked Times meet bookings | VEN-02, VEN-07 | T06 | done |
| [T09](T09-payments-cash-and-refunds.md) | Payments: cash and refunds | PAY-08, BKG-08 | T07 | done |
| [T10](T10-walk-in-booking-api.md) | Walk-in booking API | BKG-04 | T09 | done |
| [T11](T11-transfer-receipts.md) | Send a Transfer Receipt | PAY-02 | T09 | done |
| [T12](T12-ai-receipt-reading.md) | AI reads receipts, reused-receipt warning | PAY-03, PAY-06 | T11 | done |
| [T13](T13-accept-reject-receipts.md) | Accept or reject a receipt | PAY-04, PAY-05 | T12 | done |
| [T14](T14-live-updates-events.md) | Live updates (`events`) | BKG-05, PAY-07 (part) | T06 | done |
| [T15](T15-repeat-series-api.md) | Repeat series API | BKG-09 | T10 | done |
| [T16](T16-booking-reminders.md) | Booking reminders | BKG-10 | T10, T13 | done |
| [T47](T47-series-payment-collection.md) | Ask for series payments before each booking | BKG-09 | T15, T13, T46 | blocked (OQ-01) |
| **D. Bookings and payments (Staff Console)** |||||
| [T17](T17-console-booking-calendar.md) | Booking calendar | BKG-05 | T14 | done |
| [T18](T18-console-walk-in.md) | Walk-in booking screen | BKG-04 | T10, T17 | done |
| [T19](T19-console-booking-details.md) | Booking details: cancel, cash, refund | BKG-07, PAY-08, BKG-08 | T17 | done |
| [T20](T20-console-receipt-checks.md) | Receipt check queue and screen | PAY-03 to PAY-07 | T13, T14 | done |
| [T21](T21-console-repeat-series.md) | Repeat series screen | BKG-09 | T15, T18 | done |
| **E. Memberships** |||||
| [T22](T22-membership-plans.md) | Membership Plans (API + console) | MEM-01 | | done |
| [T23](T23-memberships-api.md) | Memberships API: buy, sell, renew | MEM-02, MEM-03, MEM-04 | T13, T22 | done (OQ-03 refused for now) |
| [T24](T24-console-memberships.md) | Memberships screens in the console | MEM-03, PAY-04 | T23 | done |
| [T25](T25-check-ins.md) | Check-ins (API + console) | MEM-05 | T23 | done |
| [T26](T26-membership-end-and-reminders.md) | Memberships end, and reminders | MEM-06 | T23 | done |
| **F. Customer Portal** |||||
| [T27](T27-portal-shell.md) | Portal shell, unknown address, phone layout | POR-01, POR-05 | | done |
| [T28](T28-portal-browse.md) | Browse venues, resources and free slots | POR-02, BKG-01 | T05, T27 | done |
| [T29](T29-portal-sign-in.md) | Portal sign-in and first-booking name | POR-03 | T02, T27 | done |
| [T30](T30-portal-book-and-pay.md) | Book, see how to pay, send receipt | BKG-02, PAY-01, PAY-02 | T11, T28, T29 | done |
| [T31](T31-portal-my-bookings.md) | My bookings and memberships | POR-04, BKG-06 | T30 | done |
| [T32](T32-portal-memberships.md) | Buy and renew a membership | MEM-02, MEM-04 | T23, T31 | todo |
| **G. Platform admin** |||||
| [T33](T33-tenants-api.md) | Tenant scripts: create, turn off, list | PLA-01, PLA-03, PLA-04 | T04, T06 | todo |
| **H. Assistant (n8n)** |||||
| [T35](T35-assistant-skeleton.md) | Assistant skeleton: tenant, customer, name, hand-over | AST-05, AST-06 | T02, T03 | todo |
| [T36](T36-assistant-free-slots.md) | Ask about free slots and prices | AST-01 | T35, T05 | todo |
| [T37](T37-assistant-book-and-cancel.md) | Book and cancel through chat | AST-02, AST-04 | T36, T07 | todo |
| [T38](T38-assistant-receipts.md) | Send a receipt in chat | AST-03 | T37, T11, T23 | todo |
| **I. Real services and launch** |||||
| [T39](T39-gemini-receipt-reader.md) | Gemini receipt reader adapter | PAY-03 | T12 | todo |
| [T40](T40-whatsapp-cloud-adapter.md) | WhatsApp Cloud adapter | SIG-01, SIG-03, AST-07 | T04 | todo |
| [T41](T41-sms-adapter.md) | SMS adapter | SIG-01 | | blocked (D-15) |
| [T42](T42-auth0-in-frontends.md) | Auth0 sign-in in console and portal | SIG-01 | T29 | blocked (Auth0 tenant) |
| [T43](T43-production-deployment.md) | Production deployment | | | todo |
| [T44](T44-backups.md) | Backups and restore drill | | T43 | todo |
| [T45](T45-end-to-end-tests.md) | End-to-end journeys (Playwright + axe) | POR-05 | T30, T20 | todo |

## Open decisions

Settled in a grilling session with the user. Each answer is written here, then into the ticket and the doc it changes.

| # | Question | Recommended | Answer |
|---|---|---|---|
| D-01 | Commit `tickets/` to the repo, or keep it out of git? | Commit it | Yes, commit it |
| D-02 | Merge the 10 stacked `VEN` commits on `ven-06-photos` into `main` before starting T01? | Yes | Yes. Done 2026-11-23: `main` fast-forwarded to `6d0733c` (local only, no remote) |
| D-03 | After the bookings API: Customer Portal first, or Assistant first? | Portal first | Yes, portal first |
| D-04 | A tenant with no WhatsApp number linked: what happens to its customer messages? | Don't send; log a warning | Yes |
| D-05 | Where do slots start, and which price does a slot get when a Price Rule starts mid-slot? | Grid from opening time; price of the rule covering the slot's start | Bookings start only on the clock every 30 minutes (:00, :30), whatever the opening time. A booking that runs into a Price Rule pays each half hour at the price in force then (17:30–18:30 = half default + half evening) |
| D-06 | How far ahead can customers book? | 30 days, a constant | Yes, 30 days |
| D-07 | Limit on bookings waiting for payment per customer? | At most 3 per tenant | One booking waiting for payment per customer per tenant (only `AWAITING_PAYMENT` counts; walk-ins and memberships don't). An unpaid booking can be cancelled any time, also on WhatsApp |
| D-08 | Membership states: an unpaid one timing out vs one reaching its end date | `EXPIRED` = unpaid in time (like bookings); `ENDED` = end date passed | Yes |
| D-09 | Repeat series bookings: what payment state? | `CONFIRMED`, "pay later", like a walk-in | Created `CONFIRMED`. The Advance is asked for by WhatsApp N days before each booking (venue setting, default 2, 1 to 7); skipped at Pay at Venue venues. What happens if unpaid: open question OQ-01 |
| D-10 | Repeat series clashes inside the five-route API | `POST` replies 409 listing clashing dates; resend with `skipDates` | Yes |
| D-11 | Live updates: Server-Sent Events read with `fetch` (so the sign-in header goes along), or polling? | Server-Sent Events with `fetch`, one in-memory event bus | Yes |
| D-12 | What counts as a "recent" receipt date? | On or after the day the booking was made, and not in the future | Yes |
| D-13 | "Same image" check: exact file hash only? | Yes, SHA-256 of the bytes | Yes |
| D-14 | Is `turftap.lk` registered, and is its DNS on Cloudflare? | (a fact only you know) | Not bought yet. When bought, DNS goes on Cloudflare. T43 builds with the domain as a setting; only go-live waits |
| D-15 | SMS vendor for login codes | Research Sri Lankan options in T41, you pick | Yes |
| D-16 | Storing receipts outside Sri Lanka, and backing them up: block development, or a launch checklist item? | Launch checklist item (T44) | Yes |
| D-17 | How to test the n8n workflow | API tests for what n8n calls, plus a written manual checklist per Assistant ticket | Yes |
| D-18 | Default Payment Time Limit: 20 minutes instead of 30? | Yes | Yes, for new venues; range stays 10 min to 24 h |
| D-19 | "On-site payment only" setting: what it does and where it lives | Venue setting; online bookings confirmed straight away | Yes. Named **Pay at Venue** in the glossary |
| D-20 | Slot lengths and start times | Multiples of 30 only | Each resource has a slot length (15, 30 or 60 minutes) and a **Start Interval** (bookings start every 15, 30 or 60 minutes), e.g. a 1-hour court starting every 30 minutes. Replaces the fixed 30-minute start times of D-05 |
| D-21 | Price Rule times | Only on :00 or :30 | Start and end on the resource's Start Interval |
| D-22 | Can staff change a customer's phone number, or only the name? | Both | Both. A phone another customer of the tenant already has is refused |
| D-23 | How does customer `search` match phone numbers? | Ignore spaces and dashes; a leading 0 counts as +94 | Yes: "077 123" finds +94771234567 |
| D-24 | Is a customer's name required? | Yes | Yes |
| D-25 | Platform Admin work (create and turn off tenants, link WhatsApp numbers, list tenants): Staff Console screens, or scripts on the server? | Scripts for v1 | Scripts for v1. T34 (screens) is dropped, and T03 and T33 build scripts instead of API resources. Only the Assistant's number lookup stays in the API. Screens can come later if the number of tenants grows |
| D-26 | How does the 409 for a clashing Repeat Series list the dates? | Reuse `errors` with one item per date | A new optional `clashingDates` field on error replies, so the dates aren't hidden in `message` |
| D-27 | What does the customer get when staff cancel the rest of a Repeat Series? | One new `series_cancelled` message | Yes: one message with the count and reason, not one per booking |
| D-28 | A month-long membership starting on the 29th, 30th or 31st: when does it end if next month has no such date? | That month's last day | Yes: 31 Jan + 1 month ends 28 Feb; otherwise the day before the same date (15 Jan → 14 Feb) |
| D-29 | Check-in for an active membership sold with "pay later" that still has a Balance | Let in, ask for the cash | Refused until paid; the check-in card offers **Take cash** |
| D-30 | Can one membership be checked in more than once a day? | Once a day | Up to the venue: a venue setting, on (many a day) by default |
| D-31 | Can a mistaken check-in be undone? | No undo for now | Yes, for 5 minutes, by anyone who can check in |
| D-32 | Memberships are only for gyms. How does the app know which venue has one? | A "has a gym" switch on the venue, changed by the Owner | Yes, the switch (`VEN-08`). A separate "area" inside a venue (gym, pool) was left for later, if a second kind of membership place is ever needed |
| D-33 | Which of the customer's other memberships count as "already renewed" for the reminder? | Paid, or receipt sent | Any plan at the same venue that runs past this one's last day, active or waiting for its receipt check. One only waiting to be paid doesn't count, so the customer still gets the nudge |
| D-34 | A missed or retried reminder run | Mark each reminder sent | A "reminder sent" time on the membership. Each run reminds anything ending within the next 3 days not reminded yet, so a missed day catches up and nobody gets two |
| D-35 | When do reminders go out? | 09:00 Colombo time | 09:00. Ending memberships still happens at 00:05 |
| D-36 | Tell the customer when a membership has ended? | No, the reminder is enough | No |
| D-37 | How does the portal read the tenant's name without sign-in? | `GET /v1/tenant`, a public read with no id | Yes: a singleton about the caller's tenant, open without sign-in, replying `{ slug, name }` |
| D-38 | When does the portal learn a tenant is off? | In T27, for portal callers only | Now. Portal calls (with `X-Tenant-Slug`) to a tenant that is off get 403 `tt_plt_010`; an unknown address stays 404 `tt_plt_001`. The Assistant and staff change in T33 |

## Open questions for venue owners

Business rules to confirm with real venue owners. A ticket that depends on one stays `blocked` for that part. When you have an answer, write it here, then move it into the spec.

| # | Question | Blocks | Answer |
|---|---|---|---|
| OQ-01 | A repeat series booking whose Advance wasn't paid in time: cancel it automatically and free the slot, or keep it, show "unpaid" on the calendar, and let staff decide? And by when must it be paid? | T47 | |
| OQ-02 | At a Pay at Venue venue nothing is paid online, so the one-booking limit doesn't apply. Should customers still be limited (for example to one or two upcoming bookings) to stop no-shows? | T06 (that rule only) | |
| OQ-03 | Memberships at a Pay at Venue venue: is a membership bought online active straight away and paid at the desk on the first visit, or can't it be bought online at all? | T23 (that rule only) | |
