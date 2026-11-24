# Memberships

## MEM-01 Membership Plans
As a **Manager**, I want to create Membership Plans with a name, length (in days or months) and price, so that customers can buy them.
- A plan belongs to one venue. Its name is unique among that venue's plans on sale.
- The length is 1 to 365 days or 1 to 24 months.
- A plan can be turned off. Customers can no longer buy it; existing memberships keep working.

## MEM-02 Buy a membership online
As a **Customer**, I want to buy a membership on the portal or through the Assistant, so that I can use the gym.
- I choose a start date (today or later). The end date comes from the plan's length.
- Payment uses the same Transfer Receipt steps as bookings.

## MEM-03 Sell a membership at the desk
As **Front Desk**, I want to sell a membership to someone at the desk, so that cash sales are recorded too.

## MEM-04 Renew
As a **Customer**, I want to renew before my membership ends, so that there's no gap.
- Given I renew early, when it's confirmed, then the new membership starts the day after the current one ends.

## MEM-05 Check-in
As **Front Desk**, I want to search a customer by phone number and tap "check in", so that we know who used the gym.
- Given the membership has expired or isn't paid yet, when I check them in, then I'm stopped and shown why.

## MEM-06 Expiry reminder
As a **Customer**, I want a WhatsApp message 3 days before my membership ends, so that I can renew in time.
