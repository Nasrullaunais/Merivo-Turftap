# Memberships

## MEM-01 Membership Plans
As a **Manager**, I want to create Membership Plans with a name, length (in days or months) and price, so that customers can buy them.
- A plan belongs to one venue. Its name is unique among that venue's plans on sale.
- The length is 1 to 365 days or 1 to 24 months.
- A plan can be turned off. Customers can no longer buy it; existing memberships keep working.

## MEM-02 Buy a membership online
As a **Customer**, I want to buy a membership on the portal or through the Assistant, so that I can use the gym.
- I choose a start date (today or later). The end date comes from the plan's length.
- A membership covers its start and end dates and every day between. A 10-day pass from 1 Mar ends 10 Mar. A month runs to the day before the same date next month (15 Jan → 14 Feb); when next month has no such date, to that month's last day (31 Jan → 28 Feb).
- Payment uses the same Transfer Receipt steps as bookings: the full price is due within the venue's Payment Time Limit, or the membership expires.
- I can cancel a membership while it waits for payment.
- At a Pay at Venue venue it can't be bought online yet; I'm asked to buy it at the desk (open question OQ-03).

## MEM-03 Sell a membership at the desk
As **Front Desk**, I want to sell a membership to someone at the desk, so that cash sales are recorded too.
- I give the customer's name and phone, and whether they pay in cash now or later. It's active straight away and the customer gets a WhatsApp message with the dates.
- Money still owed is paid in cash later, like a booking's balance.

## MEM-04 Renew
As a **Customer**, I want to renew before my membership ends, so that there's no gap.
- Given I renew early, when it's confirmed, then the new membership starts the day after the current one ends.
- "Current" means an active membership of the same plan that hasn't ended. A later start I ask for is kept; an earlier one moves to the day after.
- One customer can't hold the same plan twice on the same day, even while one waits for payment.

## MEM-05 Check-in
As **Front Desk**, I want to search a customer by phone number and tap "check in", so that we know who used the gym.
- Given the membership has expired or isn't paid yet, when I check them in, then I'm stopped and shown why.
- Only an active membership, between its first and last day (venue's date), with no Balance left, lets them in. Each refusal says why: not paid yet, Balance owed (I can take the cash right there and then check them in), not started yet (with the start date), ended (with the end date), cancelled.
- Each venue decides whether a membership can be checked in more than once a day (on by default). When it can't, a second check-in that day is refused with the time of the first.
- A check-in made by mistake can be undone for 5 minutes. After that it stays.

## MEM-06 Expiry reminder
As a **Customer**, I want a WhatsApp message 3 days before my membership ends, so that I can renew in time.
