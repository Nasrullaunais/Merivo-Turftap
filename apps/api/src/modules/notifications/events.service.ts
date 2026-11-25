import type { LiveEvent, LiveEventType, Permission } from "@turftap/contract";

import type { AuthContext } from "../../lib/auth/context";
import { ROLE_PERMISSIONS } from "../../lib/auth/permissions";
import { afterCommit } from "../../lib/db";

type Change = LiveEvent & { tenantId: number; venueId: number };

const READ_PERMISSION: Record<LiveEventType, Permission> = {
  "booking.changed": "bookings:read",
  "payment.changed": "payments:read",
  "membership.changed": "memberships:read",
  "check-in.changed": "check-ins:read",
};

// One API process in v1 (D-11). A second one would need Postgres LISTEN/NOTIFY instead.
const listeners = new Set<(change: Change) => void>();

/** Tells open consoles about a change once its transaction commits, so a rollback tells nobody. */
export function publish(
  auth: AuthContext,
  type: LiveEventType,
  row: { id: number; venueId: number },
): void {
  const change: Change = { type, id: row.id, tenantId: auth.tenantId, venueId: row.venueId };
  afterCommit(() => {
    for (const listener of listeners) listener(change);
  });
}

function sees(auth: AuthContext, change: Change): boolean {
  if (change.tenantId !== auth.tenantId) return false;
  if (auth.venueIds && !auth.venueIds.includes(change.venueId)) return false;
  if (auth.actor === "platform_admin") return true;
  return !!auth.role && ROLE_PERMISSIONS[auth.role].has(READ_PERMISSION[change.type]);
}

/** BKG-05, PAY-07: the changes this staff member may see, in their tenant and venues. */
export function subscribe(auth: AuthContext, send: (event: LiveEvent) => void): () => void {
  const listener = (change: Change) => {
    if (sees(auth, change)) send({ type: change.type, id: change.id });
  };
  listeners.add(listener);
  return () => listeners.delete(listener);
}
