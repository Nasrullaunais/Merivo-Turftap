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
- Given bookings that hold slots on that date (waiting for payment, waiting for a check, or confirmed), when I close it, then I see the list of affected bookings with each customer's name and phone before confirming. Closing still goes ahead; staff contact those customers themselves.

## VEN-03 Venue payment settings
As an **Owner**, I want to set how customers pay at each venue, so that online bookings match how we take money.
- Settings: bank account details shown to customers; "full amount" or "advance of X%"; time limit to send a receipt (default 20 minutes); cancellation cut-off (default 6 hours); **Pay at Venue** on or off; how many days before each repeat series booking its Advance is asked for (default 2, 1 to 7).
- The bank account has a bank name, an optional branch, an account name and an account number (digits, spaces and dashes).
- The **Advance** is 1% to 100%, where 100% is the full amount. The **Payment Time Limit** is 10 minutes to 24 hours. The **Cancellation Cut-off** is 0 to 168 hours (a week).
- Given Pay at Venue is on, then bank details and the Advance aren't needed.
- Managers and Front Desk can see the settings, so they can tell customers, but only Owners change them.
- Changes affect new bookings only.

## VEN-04 Add resources
As a **Manager**, I want to add resources to a venue, such as "Court 1" or "Pool Table 3", so that they can be booked.
- Each resource has a name, a type (futsal court, table tennis table, pool table), a slot length (15, 30 or 60 minutes) and a **Start Interval** (bookings start every 15, 30 or 60 minutes, no longer than the slot length).
- Given a resource is turned off, when customers look for free slots, then it doesn't appear. Its past bookings stay.

## VEN-05 Set prices
As a **Manager**, I want to set a default price per slot and add Price Rules for busy times, so that evenings and weekends can cost more.
- A Price Rule has weekdays, a start and end time, and a price per slot. Its times sit on the resource's Start Interval (a 60-minute interval: whole hours only).
- Given two Price Rules overlap for the same resource, when I save, then I'm told which rule clashes.
- Prices are in LKR and shown with no decimals.

## VEN-06 Upload venue photos
As a **Manager**, I want to add photos to a venue and its resources, so that the Customer Portal looks inviting.
- JPG or PNG only, up to 5 MB each. The API checks the file itself, not its name.
- The console shrinks each photo before upload (at most 1600 pixels on the long side, saved as JPG), so pages load fast on mobile data. This also removes hidden details such as where the photo was taken.
- A Photo belongs to the venue or to one of its resources. New photos go last; the first one is the cover, shown on the venue's card in the Customer Portal.
- I can move a photo earlier or later, and delete it. Deleting removes the stored file too.
- Front Desk can see the photos; customers see them without signing in.

## VEN-07 Block a resource
As a **Manager**, I want to block a resource for a time window (maintenance, private event), so that nobody books it.
- A **Blocked Time** has a start, an end (it may run over several days) and an optional reason staff see. Times are typed and shown in the venue's time zone.
- Given the end is before the start, or already past, when I save, then I'm told so.
- Given the window overlaps another Blocked Time on the same resource, when I save, then I'm told which one. Back-to-back blocks are fine.
- Front Desk can see Blocked Times; customers don't see them, only that the slots aren't free.
- Given a booking that holds slots (waiting for payment, waiting for a check, or confirmed) is in that window, when I save, then I'm stopped and told its start time and customer name. Cancelled and expired bookings don't count.

## VEN-08 Gym
As an **Owner**, I want to say whether a venue has a **Gym**, so that memberships are only sold where there is one.
- A venue has no gym until I turn it on. Only a venue with a gym sells Membership Plans and appears on the Membership Plans and Check-ins pages.
- Given the venue still sells a plan, or has a membership that isn't over (waiting for payment, waiting for a check, or active up to today or later), when I turn its gym off, then I'm told to turn off its plans and wait for those memberships to end first.
- Managers and Front Desk can see whether a venue has a gym; only Owners change it.
