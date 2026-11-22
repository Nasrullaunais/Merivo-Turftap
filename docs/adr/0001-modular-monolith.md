# One app split into modules, not separate services

TurfTap is a single backend app (a monolith) with one folder per business area (tenants, venues, bookings, memberships and so on). GenexoAI is split into many services, and that brought a gateway, a message queue and one database per service. A booking platform at this size doesn't need any of those, so we keep one thing to build, deploy and debug. Modules talk to each other only through each other's service layer, and an architecture test checks this, so we can split a module out later if we ever need to.
