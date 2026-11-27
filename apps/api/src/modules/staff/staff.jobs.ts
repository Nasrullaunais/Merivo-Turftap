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

async function staffMemberToGreet({ tenantId, staffId }: InviteData) {
  const row = await staffRepository.findById(tenantId, staffId, undefined);
  if (!row) return undefined;
  const [[user], tenant] = await Promise.all([
    usersService.usersByIds([row.userId]),
    usersService.tenantById(tenantId),
  ]);
  if (!user || !tenant) throw new Error(`Staff ${staffId} has no user or tenant row`);
  return { role: row.role, phone: user.phone, tenantName: tenant.name };
}

/** SIG-03: tells a new staff member where the console is. Sent from the TurfTap number. */
export async function sendStaffInvite(data: InviteData) {
  const member = await staffMemberToGreet(data);
  if (!member) return;
  await ports().messaging.send({
    kind: "template",
    from: TURFTAP_NUMBER,
    to: member.phone,
    template: WHATSAPP_TEMPLATES.staffInvite,
    values: [member.tenantName, ROLE_NAMES[member.role], config.consoleUrl],
  });
}

export const staffInviteJob = defineJob<InviteData>("staff-invite", sendStaffInvite);

/** PLA-01: welcomes the first Owner of a new tenant, from the TurfTap number. */
export async function sendOwnerWelcome(data: InviteData) {
  const member = await staffMemberToGreet(data);
  if (!member) return;
  await ports().messaging.send({
    kind: "template",
    from: TURFTAP_NUMBER,
    to: member.phone,
    template: WHATSAPP_TEMPLATES.ownerWelcome,
    values: [member.tenantName, config.consoleUrl],
  });
}

export const ownerWelcomeJob = defineJob<InviteData>("owner-welcome", sendOwnerWelcome);
