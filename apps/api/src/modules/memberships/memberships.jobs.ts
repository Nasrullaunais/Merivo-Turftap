import { defineJob, defineScheduledJob } from "../../lib/jobs";
import * as membershipEndService from "./membership-end.service";
import * as membershipExpiryService from "./membership-expiry.service";

type MembershipJobData = { tenantId: number; membershipId: number };

export const expireMembershipJob = defineJob<MembershipJobData>(
  "expire-membership",
  ({ tenantId, membershipId }) => membershipExpiryService.expire(tenantId, membershipId),
);

const SRI_LANKA = "Asia/Colombo";
defineScheduledJob("end-memberships", { cron: "5 0 * * *", timeZone: SRI_LANKA }, () =>
  membershipEndService.endPast(),
);
/** D-35: at 09:00, so nobody gets a WhatsApp just after midnight. */
defineScheduledJob("membership-reminders", { cron: "0 9 * * *", timeZone: SRI_LANKA }, () =>
  membershipEndService.remindEndingSoon(),
);
