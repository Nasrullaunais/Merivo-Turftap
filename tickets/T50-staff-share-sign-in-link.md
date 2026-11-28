# T50 Owners pass on the sign-in link themselves

Status: done · Stories: `SIG-03`, `PLA-01` · Depends on: T40

## Goal
New staff and a new tenant's first Owner learn where to sign in, without a WhatsApp template from TurfTap (D-51).

## Read first
- `docs/spec/sign-in-and-staff.md` (SIG-03), `docs/spec/platform-admin.md` (PLA-01), `docs/architecture/console-design.md`, `apps/api/src/modules/staff/`.

## Build
- Remove the `staff_invite` and `owner_welcome` templates, their jobs and the `staff-invite` and `owner-welcome` queues.
- Console: after adding staff, offer **Send on WhatsApp**, which opens WhatsApp on the Owner's own phone (`https://wa.me/<number>?text=`) with a short message holding the console address, and **Copy message**. Skipping is fine; the new staff member is already added.
- `bun run tenant:create` prints the same message for the first Owner, for the Platform Admin to pass on.
- Update SIG-03 and PLA-01 in the spec.

## Done when
- Adding staff in the console leads straight to sending them the link, on phone and desktop; `bun run check` passes.
