import { defineJob } from "../../lib/jobs";
import * as membershipExpiryService from "./membership-expiry.service";

type MembershipJobData = { tenantId: number; membershipId: number };

export const expireMembershipJob = defineJob<MembershipJobData>(
  "expire-membership",
  ({ tenantId, membershipId }) => membershipExpiryService.expire(tenantId, membershipId),
);
