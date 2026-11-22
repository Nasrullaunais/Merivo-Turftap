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
A business that uses TurfTap, such as a sports company with one or more branches. All of its data is kept apart from every other tenant.
_Avoid_: Client, organisation, company

**Staff**:
A user who works for a tenant with one of the roles Owner, Manager or Front Desk, and uses the Staff Console.
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

## Bookings

**Slot**:
The smallest block of time a resource can be booked for, such as 60 minutes for a futsal court or 30 minutes for a pool table.
_Avoid_: Period, session

**Price Rule**:
A price per slot for one resource on chosen weekdays between a start and end time, such as evenings and weekends. Any slot no Price Rule covers costs the resource's default price.
_Avoid_: Rate, tariff, peak pricing

**Blocked Time**:
A time window when staff have stopped one resource from being booked, such as for maintenance or a private event. A whole venue closing for a day is a closed date, not Blocked Time.
_Avoid_: Block, closure, maintenance window

**Booking**:
A customer's reservation of one resource for one or more back-to-back slots.
_Avoid_: Reservation, appointment

**Repeat Series**:
A set of bookings for the same resource and time each week, created together by staff.
_Avoid_: Recurring booking, subscription

**Cancellation Cut-off**:
How long before a booking starts the customer can still cancel it themselves. After that, only staff can cancel.
_Avoid_: Cancellation window, deadline

**Walk-in Booking**:
A booking staff create at the desk or over the phone, paid in cash or later.
_Avoid_: Manual booking, offline booking

## Memberships

**Membership Plan**:
Something a venue sells that gives access for a period, such as "Gym monthly".
_Avoid_: Package, subscription plan

**Membership**:
One customer's purchase of a membership plan, with a start and end date. It has no time slots.
_Avoid_: Subscription, pass. Never use "membership" for a staff member's link to a tenant.

**Check-in**:
A record that a customer with an active membership entered the venue.
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

## Payments

**Transfer Receipt**:
The proof a customer sends after paying by bank transfer, such as a screenshot or photo of the bank slip.
_Avoid_: Slip, payment proof, invoice

**Receipt Check**:
Staff's decision to accept or reject a transfer receipt, helped by an AI suggestion.
_Avoid_: Verification, approval

**Advance**:
The part of a booking's price a venue asks for before the booking is confirmed; the rest is paid at the venue.
_Avoid_: Deposit, down payment
