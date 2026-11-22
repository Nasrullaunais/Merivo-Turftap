# Sign-in and staff

## SIG-01 Sign in with a phone number
As a **User**, I want to sign in with my phone number and a **Login Code**, so that I don't need a password.
- Given I enter my phone number, when I ask for a code, then a 6-digit code arrives on WhatsApp from the TurfTap number.
- Given a code was sent to my number in the last 10 minutes, when I ask for another one ("Send by SMS"), then it arrives by SMS instead, so I can still sign in without WhatsApp or when WhatsApp is down.
- Given a correct code within 3 minutes, when I submit it, then I am signed in.
- Given 3 wrong codes, when I try again, then I must ask for a new code.
- Phone numbers are stored in one format (`+94771234567`), whatever way the user types them.

## SIG-02 Pick a tenant in the Staff Console
As **Staff** at more than one tenant, I want to pick which tenant I'm working in, so that I see the right data.
- Given I'm staff at one tenant, when I sign in, then that tenant opens straight away.
- Given I'm staff at several, when I sign in, then I see a tenant picker and can switch later from the top bar.
- Given I'm not staff anywhere and not a Platform Admin, when I open the Staff Console, then I see "You don't have access to any venue yet".

## SIG-03 Invite staff
As an **Owner**, I want to add staff by phone number with a role, so that they can use the Staff Console.
- Given a phone number and a role (Owner, Manager, Front Desk), when I add them, then they get a WhatsApp message with the console link.
- Given the person has never signed in, when they first sign in with that number, then they land in my tenant with that role.
- Given the number is already staff in my tenant, when I add it again, then I'm told they're already staff.

## SIG-04 Change or remove staff
As an **Owner**, I want to change a staff member's role or remove them, so that access matches their job.
- Given I remove someone, when they next use the console, then they lose access to my tenant within a few minutes.
- Given I'm the last Owner, when I try to remove myself or change my role, then I'm stopped.

## SIG-05 What each role can do
As an **Owner**, I want roles to limit what staff can do, so that front desk staff can't change prices or settings.
- Given a Front Desk user, when they open settings, prices or staff pages, then those pages are hidden and the API refuses the requests.
- The permission list for each role is in [docs/architecture/api.md](../architecture/api.md).

## SIG-06 Choose which venues staff work at
As an **Owner** with several venues, I want to limit a Manager or Front Desk to some of them, so that each branch's staff only see and change their own branch.
- Given I add or change a Manager or Front Desk, when I pick "All venues" or a list of venues, then they only see and change what belongs to those venues. Something at another venue looks as if it doesn't exist.
- An Owner always has every venue.
- Given I pick no venues and turn off "All venues", when I save, then I'm told to pick at least one.
- Given a limited Manager opens the staff list, when it loads, then they see the staff who share one of their venues and the staff at every venue.
- Customers can book at any venue, whoever the staff are.
