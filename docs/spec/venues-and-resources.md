# Venues and resources

## VEN-01 Add a venue
As an **Owner**, I want to add a venue with its address, phone number and opening hours, so that customers can book there.
- Opening hours are set per weekday and can differ each day. A day can be closed.
- Given a venue name already used in my tenant (ignoring case), when I save, then I'm told it's taken.

## VEN-02 Close a venue for a day
As a **Manager**, I want to mark a date as closed (a holiday), so that nobody can book it.
- Given existing bookings on that date, when I close it, then I see the list of affected bookings before confirming. Staff contact those customers themselves.

## VEN-03 Venue payment settings
As an **Owner**, I want to set how customers pay at each venue, so that online bookings match how we take money.
- Settings: bank account details shown to customers; "full amount" or "advance of X%"; time limit to send a receipt (default 30 minutes); cancellation cut-off (default 6 hours).
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
- Given a booking already exists in that window, when I try to block it, then I'm stopped and shown the booking.
