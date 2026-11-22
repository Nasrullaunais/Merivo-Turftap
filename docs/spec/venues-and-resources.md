# Venues and resources

## VEN-01 Add a venue
As an **Owner**, I want to add a venue with its address, phone number and opening hours, so that customers can book there.
- Opening hours are set per weekday and can differ each day. A day can be closed.
- Given a venue name already used in my tenant (ignoring case), when I save, then I'm told it's taken.

## VEN-02 Close a venue for a day
As a **Manager**, I want to mark a date as closed (a holiday), so that nobody can book it.
- A **Closed Date** can have a short reason customers see, such as "Vesak Poya".
- Given a date before today in the venue's time zone, when I save, then I'm told it must be today or later.
- Given the venue is already closed that day, when I save, then I'm told so.
- Given I reopen a Closed Date, then the venue follows its opening hours that day again.
- Given existing bookings on that date, when I close it, then I see the list of affected bookings before confirming. Staff contact those customers themselves. _Built with bookings (`BKG-02`), since there are no bookings yet._

## VEN-03 Venue payment settings
As an **Owner**, I want to set how customers pay at each venue, so that online bookings match how we take money.
- Settings: bank account details shown to customers; "full amount" or "advance of X%"; time limit to send a receipt (default 30 minutes); cancellation cut-off (default 6 hours).
- The bank account has a bank name, an optional branch, an account name and an account number (digits, spaces and dashes).
- The **Advance** is 1% to 100%, where 100% is the full amount. The **Payment Time Limit** is 10 minutes to 24 hours. The **Cancellation Cut-off** is 0 to 168 hours (a week).
- Managers and Front Desk can see the settings, so they can tell customers, but only Owners change them.
- Changes affect new bookings only.

## VEN-04 Add resources
As a **Manager**, I want to add resources to a venue, such as "Court 1" or "Pool Table 3", so that they can be booked.
- Each resource has a name, a type (futsal court, table tennis table, pool table) and a slot length (e.g. 60 or 30 minutes).
- Given a resource is turned off, when customers look for free slots, then it doesn't appear. Its past bookings stay.

## VEN-05 Set prices
As a **Manager**, I want to set a default price per slot and add Price Rules for busy times, so that evenings and weekends can cost more.
- A Price Rule has weekdays, a start and end time, and a price per slot.
- Given two Price Rules overlap for the same resource, when I save, then I'm told which rule clashes.
- Prices are in LKR and shown with no decimals.

## VEN-06 Upload venue photos
As a **Manager**, I want to add photos to a venue and its resources, so that the Customer Portal looks inviting.
- JPG or PNG only, up to 5 MB each.

## VEN-07 Block a resource
As a **Manager**, I want to block a resource for a time window (maintenance, private event), so that nobody books it.
- A **Blocked Time** has a start, an end (it may run over several days) and an optional reason staff see. Times are typed and shown in the venue's time zone.
- Given the end is before the start, or already past, when I save, then I'm told so.
- Given the window overlaps another Blocked Time on the same resource, when I save, then I'm told which one. Back-to-back blocks are fine.
- Front Desk can see Blocked Times; customers don't see them, only that the slots aren't free.
- Given a booking already exists in that window, when I try to block it, then I'm stopped and shown the booking. _Built with bookings (`BKG-02`), since there are no bookings yet._
