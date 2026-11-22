import type { StaffRole } from "../../lib/auth/context";
import { config } from "../../lib/config";
import { defineJob } from "../../lib/jobs";
import { ports } from "../../ports";
import { TURFTAP_NUMBER, WHATSAPP_TEMPLATES } from "../../ports/messaging-channel";
import * as usersService from "../platform/users.service";
import * as staffRepository from "./staff.repository";

const ROLE_NAMES: Record<StaffRole, string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  FRONT_DESK: "Front Desk",
};

type InviteData = { tenantId: number; staffId: number };

/** SIG-03: tells a new staff member where the console is. Sent from the TurfTap number. */
export async function sendStaffInvite({ tenantId, staffId }: InviteData) {
  const row = await staffRepository.findById(tenantId, staffId, undefined);
  if (!row) return;
  const [[user], tenant] = await Promise.all([
    usersService.usersByIds([row.userId]),
    usersService.tenantById(tenantId),
  ]);
  if (!user || !tenant) throw new Error(`Staff ${staffId} has no user or tenant row`);
  await ports().messaging.send({
    kind: "template",
    from: TURFTAP_NUMBER,
    to: user.phone,
    template: WHATSAPP_TEMPLATES.staffInvite,
    values: [tenant.name, ROLE_NAMES[row.role], config.consoleUrl],
  });
}

export const staffInviteJob = defineJob<InviteData>("staff-invite", sendStaffInvite);
