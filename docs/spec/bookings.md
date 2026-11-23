# Bookings

## BKG-01 See free slots
As a **Customer** or **Staff**, I want to see which slots are free for a resource on a date, so that I can choose a time.
- Free means: inside opening hours, not on a closed date, not blocked, not already booked, and not in the past.
- Bookings start on the resource's **Start Interval** (every 15, 30 or 60 minutes on the clock), whatever the opening time.
- Each free slot shows its price. A booking that runs into a Price Rule pays each part at the price in force then.
- Times are shown in the venue's time zone (`Asia/Colombo`).

## BKG-02 Book online
As a **Customer**, I want to book one or more back-to-back slots, so that I can play.
- Given I pick slots and confirm, when the booking is made, then it waits for payment and holds the slots for the venue's time limit.
- The server works out the price. The amount to pay now is the full price or the venue's advance.
- Given someone else books the same slot a moment earlier, when I confirm, then I'm told the slot was just taken.
- Given I already have a booking waiting for payment at this tenant, when I book again, then I'm told to pay for or cancel that one first.
- I can book up to 30 days ahead.
- Given the venue is **Pay at Venue**, when the booking is made, then it's confirmed straight away and I pay at the venue.

## BKG-03 Booking expires without payment
As an **Owner**, I want unpaid bookings to free their slots, so that slots aren't held forever.
- Given no Transfer Receipt arrives within the time limit, when the limit passes, then the booking expires and the customer gets a WhatsApp message.

## BKG-04 Walk-in booking
As **Front Desk**, I want to book for someone at the desk or on the phone, so that every booking lives in one calendar.
- I type a name and phone number. An existing customer with that number is reused.
- The booking is confirmed straight away, marked "paid in cash" or "pay later".

## BKG-05 Booking calendar
As **Staff**, I want a day and week calendar per venue, so that I can see what's happening at a glance.
- Each booking's state shows by colour and icon: waiting for payment, waiting for receipt check, confirmed, blocked.
- New bookings appear without refreshing the page.

## BKG-06 Customer cancels
As a **Customer**, I want to cancel my booking before the cut-off, so that someone else can use the slot.
- Given the start is further away than the venue's cut-off, when I cancel, then the booking is cancelled and the slots are free again.
- Given the cut-off has passed, when I try, then I'm told to contact the venue, with its phone number.
- Given my booking is still waiting for payment, then I can cancel it at any time, even after the cut-off.

## BKG-07 Staff cancels
As **Staff**, I want to cancel any booking with a reason, so that I can handle special cases.
- The customer gets a WhatsApp message with the reason.

## BKG-08 Record a refund
As a **Manager**, I want to record a refund on a cancelled booking, so that our books show what we paid back.
- The refund itself is a bank transfer made outside TurfTap; we only record the amount and a note.

## BKG-09 Repeat series
As **Staff**, I want to book the same resource and time every week for a number of weeks, so that regular teams don't have to rebook.
- Every booking in the series is created up front and confirmed.
- The Advance for each booking is asked for by WhatsApp a set number of days before it (a venue setting, default 2), except at Pay at Venue venues. _What happens if it isn't paid in time is still open: OQ-01 in `tickets/README.md`._
- Given any week clashes, when I save, then I see which dates clash and can skip them or cancel.
- I can cancel one booking or the rest of the series.

## BKG-10 Reminder
As a **Customer**, I want a WhatsApp reminder 3 hours before my booking, so that I don't forget.
