# Customer Portal

## POR-01 Tenant address
As a **Customer**, I want to open my venue's own web address (`<tenant>.turftap.lk`), so that I only see that business.
- Given an unknown address, when I open it, then I see a "venue not found" page.

## POR-02 Browse without signing in
As a **Customer**, I want to see venues, resources, prices and free slots before signing in, so that I can decide first.
- Signing in is asked for only when I book or buy.

## POR-03 First booking creates my customer record
As a **Customer**, I want to give my name once, so that the venue knows who I am.
- Given I sign in to a tenant for the first time, when I book, then I'm asked for my name and a customer record is created for that tenant.
- Given I already booked through the Assistant with the same phone number, when I sign in, then my earlier bookings are there.

## POR-04 My bookings and memberships
As a **Customer**, I want to see my upcoming and past bookings and my memberships, so that I can manage them.
- From here I can send a receipt, cancel before the cut-off, and renew a membership.

## POR-05 Works on a phone
As a **Customer**, I want the portal to work well on a phone screen, so that I can book on the go.
