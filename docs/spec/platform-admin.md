# Platform admin

In v1 a Platform Admin does this work by running scripts on the server, not in the Staff Console ([tickets D-25](../../tickets/README.md#open-decisions)). Screens can follow once there are enough tenants to need them.

## PLA-01 Create a tenant
As a **Platform Admin**, I want to create a tenant with a name, web address (`<slug>.turftap.lk`) and its first Owner's phone number, so that a new business can start.
- The slug uses only lowercase letters, numbers and single hyphens (not at the start or end), is 3 to 30 characters long, and must be unique.
- Addresses the server itself uses are refused: `www`, `api`, `console`, `admin`, `app`, `n8n`, `mail`, `status`, `help` (D-40).
- The Owner gets a WhatsApp message from the TurfTap number with the console link.
- Script: `bun run tenant:create <slug> <name> <owner phone>`. `bun run admin:add <phone>` makes a user a Platform Admin.

## PLA-02 Connect a WhatsApp number
As a **Platform Admin**, I want to link a tenant's WhatsApp Business number to the tenant, so that the Assistant answers for the right business.
- One number belongs to one tenant only.
- Setting the number up with Meta is done by hand outside TurfTap.
- Script: `bun run whatsapp:link <tenant slug> <Meta phone number id> <phone>`; `bun run whatsapp:unlink <tenant slug>` removes it.

## PLA-03 Turn a tenant off
As a **Platform Admin**, I want to turn a tenant off, so that a business that stopped paying can't take bookings.
- Given a tenant is off, then its portal shows "not available", the Assistant stops replying, and staff can sign in but can't make changes.
- Staff see a banner on every page saying the business is paused and to contact TurfTap; a change they try is refused with an error (D-41).
- No messages go to its customers while it is off.
- Script: `bun run tenant:off <slug>`; `bun run tenant:on <slug>` turns it back on.

## PLA-04 List tenants
As a **Platform Admin**, I want a list of tenants with their status and number of bookings this month, so that I can see how the platform is doing.
- "Bookings this month" counts bookings that start in the current calendar month on Sri Lankan clocks, leaving out expired and cancelled ones (D-39).
- Script: `bun run tenants:list`.
