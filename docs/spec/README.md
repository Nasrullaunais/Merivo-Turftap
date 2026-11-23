# TurfTap v1 spec

TurfTap lets sports and fitness venues in Sri Lanka take bookings and sell gym memberships. Customers book through a website (the Customer Portal) or by chatting on WhatsApp (the Assistant). Staff run everything from the Staff Console. Words in **bold** are defined in [GLOSSARY.md](../../GLOSSARY.md).

## Roles

| Role | Signs in with | Uses |
|---|---|---|
| **Customer** | Phone number + WhatsApp code | Customer Portal, Assistant |
| **Staff**: Owner | Phone number + WhatsApp code | Staff Console: everything in their tenant, including settings and staff |
| **Staff**: Manager | Phone number + WhatsApp code | Staff Console: venues, prices, bookings, memberships, receipt checks |
| **Staff**: Front Desk | Phone number + WhatsApp code | Staff Console: bookings, walk-ins, check-ins, receipt checks |
| **Platform Admin** | Phone number + WhatsApp code | Staff Console: tenants and WhatsApp numbers |

## In v1

| Area | Stories |
|---|---|
| Sign-in and staff | [sign-in-and-staff.md](sign-in-and-staff.md) |
| Venues and resources | [venues-and-resources.md](venues-and-resources.md) |
| Bookings | [bookings.md](bookings.md) |
| Payments | [payments.md](payments.md) |
| Memberships | [memberships.md](memberships.md) |
| Customer Portal | [customer-portal.md](customer-portal.md) |
| Assistant | [assistant.md](assistant.md) |
| Platform admin | [platform-admin.md](platform-admin.md) |

## Later, not in v1

- Online card payments (the `PaymentProvider` interface exists, with no adapter yet)
- AI confirming receipts on its own
- Staff reading or taking over Assistant chats
- Repeat series created by customers
- Gym classes and personal-trainer slots
- QR code check-in
- Custom staff roles
- Sinhala and Tamil screens (the Assistant already replies in the customer's language)
- Charging tenants through TurfTap (invoiced by hand for now)
- A shared marketplace across tenants

## How stories are written

Each story has an ID (`BKG-03`) that code, tests and pull requests refer to. Acceptance criteria use *Given / When / Then*. When a story changes, edit it in place and note the change in the pull request.

## Decided while writing the spec

These came up while writing the spec and were approved afterwards:

1. **Blocked Time**: staff can block a resource for a time window (maintenance, a private event) so nobody can book it. `VEN-07`.
2. **Price Rule**: a price per slot for chosen weekdays and hours, with a default price for every other time. `VEN-05`.
3. **Rejected receipt**: the booking goes back to waiting for payment with a fresh time limit, so the customer can send a clearer receipt. `PAY-05`.
4. **Bank details and payment settings live on the venue**, not the tenant, because branches may use different accounts. `VEN-03`.
5. **Resource types are a fixed list in code** (futsal court, table tennis table, pool table), easy to extend. `VEN-04`.
6. **Booking reminders** go out 3 hours before start, fixed for v1. `BKG-10`.
7. **Customers can browse free slots without signing in**, and sign in only when they book. `POR-02`.
8. **Login codes fall back to SMS**: a resend within 10 minutes goes by SMS instead of WhatsApp ([ADR 0010](../adr/0010-login-codes-fall-back-to-sms.md)). `SIG-01`.

Decided on 2026-11-23 while planning the tickets (`tickets/README.md`, D-05 to D-21):

9. **Slot length and Start Interval per resource**: slots are 15, 30 or 60 minutes, and bookings start every 15, 30 or 60 minutes on the clock. Price Rules fit the Start Interval; a booking running into one pays each part at the price then. `VEN-04`, `VEN-05`, `BKG-01`.
10. **One unpaid booking at a time**: a customer may have one booking waiting for payment per tenant, and can cancel it any time. Customers book up to 30 days ahead. `BKG-02`, `BKG-06`.
11. **Pay at Venue**: a venue setting; online bookings there are confirmed straight away. `VEN-03`, `BKG-02`.
12. **Payment Time Limit default is 20 minutes**, down from 30. `VEN-03`.
13. **Repeat series are confirmed when created**, and the Advance is asked for a few days before each booking (venue setting, default 2). `BKG-09`.
14. **Membership states**: `EXPIRED` means not paid in time, like a booking; `ENDED` means the end date passed. `MEM-*`.
