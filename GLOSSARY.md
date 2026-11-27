# TurfTap

A booking platform for sports and fitness venues. Businesses rent out courts and tables by the hour and sell gym memberships; their customers book through a web portal or a WhatsApp assistant.

## Who's who

**User**:
A person who can sign in, identified by their phone number. One user can be staff at one tenant and a customer at others.
_Avoid_: Account, login, member

**Login Code**:
The 6-digit code a user receives to sign in. It goes by WhatsApp first; a resend soon after goes by SMS.
_Avoid_: OTP, PIN, verification code

**Tenant**:
A business that uses TurfTap, such as a sports company with one or more branches. All of its data is kept apart from every other tenant. A Platform Admin can turn a tenant off (for example when it stops paying): its staff can still look but not change anything, and its portal and Assistant close.
_Avoid_: Client, organisation, company

**Staff**:
A user who works for a tenant with one of the roles Owner, Manager or Front Desk, and uses the Staff Console. Managers and Front Desk work at every venue of the tenant or only at the venues the Owner picks; Owners always have every venue.
_Avoid_: Employee, admin

**Owner**:
The staff role that runs a tenant. An Owner can do everything in their tenant, including settings and adding, changing or removing staff. A tenant always has at least one Owner.
_Avoid_: Admin, boss

**Manager**:
The staff role that runs the venues day to day: venues, prices, bookings, memberships and receipt checks. A Manager can see the staff list but not change it.
_Avoid_: Supervisor

**Front Desk**:
The staff role for the person at the counter who serves customers in person or on the phone: bookings, walk-ins, check-ins and receipt checks. Front Desk can't open the settings, prices or staff pages.
_Avoid_: Receptionist, cashier

**Platform Admin**:
A person who runs TurfTap itself: creates tenants and connects their WhatsApp numbers.
_Avoid_: Super admin, root

**Customer**:
A person who books resources or buys memberships from one tenant. Each tenant keeps its own record of the person, linked by phone number.
_Avoid_: Player, client, guest

## Places and things

**Venue**:
One physical location owned by a tenant, with its own address and opening hours.
_Avoid_: Branch, location, site, facility

**Resource**:
One thing inside a venue that can be booked by time, such as "Futsal Court 1" or "Pool Table 3".
_Avoid_: Court, table, asset, facility, slot

**Sport**:
A venue's resources of one type shown together to customers, such as "Pool" for its pool tables. The portal lists a venue's sports first, then its resources of the chosen one.
_Avoid_: Category, activity, resource type (on screens)

**Gym**:
The part of a venue that people enter with a membership instead of booking by time. A venue has a gym or not; only a venue with a gym sells Membership Plans and checks members in.
_Avoid_: Fitness centre, facility

**Photo**:
A picture of a venue or of one of its resources, shown on the Customer Portal. The first one is the **cover**.
_Avoid_: Image, picture, gallery

## Bookings

**Slot**:
The smallest block of time a resource can be booked for: 15, 30 or 60 minutes, set per resource. For example, 60 minutes for a futsal court or 30 minutes for a pool table. A booking is one or more slots.
_Avoid_: Period, session

**Start Interval**:
How often bookings for a resource may start, on the clock: every 15, 30 or 60 minutes, whatever the opening time. A 60-minute court with a 30-minute Start Interval can be booked from 17:00 or 17:30.
_Avoid_: Grid, step, time increment

**Price Rule**:
A price per slot for one resource on chosen weekdays between a start and end time, such as evenings and weekends. Any slot no Price Rule covers costs the resource's default price. Its start and end times sit on the resource's Start Interval. A booking that runs into a Price Rule pays each part at the price in force then.
_Avoid_: Rate, tariff, peak pricing

**Closed Date**:
A date when a whole venue is closed, such as a public holiday, so none of its resources can be booked that day. It can carry a short reason customers see, like "Vesak Poya".
_Avoid_: Holiday, closure, day off

**Blocked Time**:
A time window when staff have stopped one resource from being booked, such as for maintenance or a private event. A whole venue closing for a day is a Closed Date, not Blocked Time.
_Avoid_: Block, closure, maintenance window

**Booking**:
A customer's reservation of one resource for one or more back-to-back slots.
_Avoid_: Reservation, appointment

**Repeat Series**:
A set of bookings for the same resource and time each week, created together by staff. Its bookings are confirmed when created; the Advance for each one is asked for a few days before it (each venue sets how many; the default is 2).
_Avoid_: Recurring booking, subscription

**Cancellation Cut-off**:
How long before a booking starts the customer can still cancel it themselves. After that, only staff can cancel. Each venue sets its own; the default is 6 hours.
_Avoid_: Cancellation window, deadline

**Walk-in Booking**:
A booking staff create at the desk or over the phone, paid in cash or later.
_Avoid_: Manual booking, offline booking

## Memberships

**Membership Plan**:
Something a venue with a gym sells that gives access for a period, such as "Gym monthly".
_Avoid_: Package, subscription plan

**Membership**:
One customer's purchase of a membership plan, with a start and end date. It has no time slots.
_Avoid_: Subscription, pass. Never use "membership" for a staff member's link to a tenant.

**Check-in**:
A record that a customer with an active, fully paid membership entered the venue. It can be undone only in the first few minutes.
_Avoid_: Visit, attendance

## Channels

**Customer Portal**:
The website where customers book and pay.
_Avoid_: Customer app, booking site

**Staff Console**:
The website where staff and platform admins run venues, bookings, memberships and receipt checks.
_Avoid_: Admin panel, dashboard, back office

**Assistant**:
The AI-powered WhatsApp chat that customers use to book and pay.
_Avoid_: Bot, chatbot, agent

**Chat Offer**:
What the Assistant puts to a customer before it books or cancels anything for them: the exact booking with its price, or the booking to cancel, with Yes and No to tap. When a customer with several things waiting for payment sends a Transfer Receipt, the Chat Offer is instead the list of those things, to pick the one it pays for. Nothing changes until the customer answers in a later message. A Chat Offer runs out after 10 minutes, or when a newer one replaces it.
_Avoid_: Proposal, quote, pending action

## Payments

**Payment**:
Money recorded on a booking: a bank transfer with its Transfer Receipt, cash taken at the venue, or a refund.
_Avoid_: Transaction, charge

**Balance**:
What is still to pay on a booking or a membership: its price minus the payments accepted so far. Front Desk takes it in cash at the venue.
_Avoid_: Outstanding, remaining amount, amount owed

**Refund**:
Money a venue pays back on a cancelled booking, by bank transfer outside TurfTap. TurfTap only records the amount and a note.
_Avoid_: Reversal, chargeback, return

**Transfer Receipt**:
The proof a customer sends after paying by bank transfer, such as a screenshot or photo of the bank slip.
_Avoid_: Slip, payment proof, invoice

**Receipt Check**:
Staff's decision to accept or reject a transfer receipt, helped by an AI suggestion.
_Avoid_: Verification, approval

**Receipt Reading**:
What the AI read from a Transfer Receipt (amount, date paid, bank, reference), with whether the amount matches, the date is recent and the receipt was used before. It only helps the Receipt Check; it never accepts or rejects anything.
_Avoid_: Scan, OCR result, AI verdict

**Advance**:
The part of a booking's price a venue asks for before the booking is confirmed; the rest is paid at the venue. Each venue sets it as a percentage; 100% means the full amount.
_Avoid_: Deposit, down payment

**Pay at Venue**:
A venue setting where customers pay everything at the venue. Online bookings there are confirmed straight away, with nothing to pay online.
_Avoid_: Cash only, offline payment, on-site payment

**Payment Time Limit**:
How long a customer has, after booking online, to send a Transfer Receipt before the booking expires and its slots are free again. Each venue sets its own; the default is 20 minutes.
_Avoid_: Hold time, expiry window, grace period
