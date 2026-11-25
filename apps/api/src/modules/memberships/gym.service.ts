import type { AuthContext } from "../../lib/auth/context";
import { todayIn } from "../../lib/time";
import * as membershipPlansRepository from "./membership-plans.repository";

/** VEN-08: plans on sale or memberships not over. Kept out of membership-plans.service,
 *  which uses venues, so venues can call it without an import circle. */
export function inUse(auth: AuthContext, venue: { id: number; timeZone: string }) {
  return membershipPlansRepository.gymInUse(auth.tenantId, venue.id, todayIn(venue.timeZone));
}
