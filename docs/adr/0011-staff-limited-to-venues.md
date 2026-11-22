# Staff can be limited to some venues; roles stay fixed in code

A tenant with several branches needs a Manager or Front Desk who works at only some of them. Each staff row has an `all_venues` flag. When it is false, the `staff_venues` table lists the venues they work at. Owners always have every venue, and a database check makes sure of it. The list travels on the caller (`venueIds`), and every repository function for venue data takes it and adds it to the SQL `WHERE`, next to `tenant_id`.

We looked at moving roles into a database table, so each tenant could make its own roles, as GenexoAI does. We kept the three fixed roles (Owner, Manager, Front Desk) in code. Small venues don't need a role editor, and a fixed role keeps tests meaningful ("Front Desk can't change prices" stays true everywhere). The API already checks permissions (`price-rules:create`), not role names, so moving the role list into a table later changes one lookup, not every route.

## Consequences

- Something at a venue the caller doesn't work at replies 404, the same as something that doesn't exist, so a limited Manager can't learn another branch's data.
- A limited Manager sees staff who share one of their venues, plus staff at every venue. They only see the venue ids they work at themselves.
- Customers belong to the whole tenant, because they can book at any branch. When the customers module is built, every staff member can find any customer, but bookings, payments and memberships are limited by venue.
- Every module whose tables point at a venue or resource has a `*.venue-scope.test.ts`; architecture rule 13 checks the file exists.
- A change to someone's venues takes effect on their next request, after the few-minute sign-in cache, the same as a role change.
- A new fixed role (for example a Trainer) is one value in `STAFF_ROLES`, a migration for the enum, and a line in `ROLE_PERMISSIONS`. If tenants ask for roles of their own, we revisit this decision.
