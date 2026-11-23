import { PhoneInput, PhoneNumberId, type WhatsAppNumberFilters } from "@turftap/contract";
import { z } from "zod";

import type { Caller } from "../../lib/auth/context";
import { transaction } from "../../lib/db";
import { parse } from "../../lib/http/input";
import type { ListQuery } from "../../lib/resource";
import { platformErrors } from "./platform.errors";
import * as platformRepository from "./platform.repository";

// Apart from platform.service.ts so T04's notifications can use it without importing the
// customers and staff modules that platform.service.ts depends on.

const LinkWhatsAppNumber = z.object({
  tenantSlug: z.string().trim().min(1),
  phoneNumberId: PhoneNumberId,
  phone: PhoneInput,
});

/** AST-05: the Assistant finds which tenant a chat belongs to, before it knows the tenant. */
export function list(
  _caller: Caller,
  { filters, page }: ListQuery<WhatsAppNumberFilters, "createdAt">,
) {
  return platformRepository.listWhatsAppNumbers(filters.phoneNumberId, page);
}

/** The number the tenant's customer messages are sent from, if it has one linked. */
export function numberOfTenant(tenantId: number) {
  return platformRepository.findWhatsAppNumberOfTenant(tenantId);
}

async function tenantBySlug(slug: string) {
  const tenant = await platformRepository.findTenantBySlug(slug);
  if (!tenant) throw platformErrors.tenantNotFound();
  return tenant;
}

/** PLA-02, run by a Platform Admin from `bun run whatsapp:link`. */
export async function link(input: z.input<typeof LinkWhatsAppNumber>) {
  const { tenantSlug, phoneNumberId, phone } = parse(LinkWhatsAppNumber, input);
  const tenant = await tenantBySlug(tenantSlug);
  return transaction(() =>
    platformRepository.insertWhatsAppNumber({ tenantId: tenant.id, phoneNumberId, phone }),
  );
}

export async function unlink(tenantSlug: string) {
  const tenant = await tenantBySlug(tenantSlug);
  const removed = await transaction(() =>
    platformRepository.deleteWhatsAppNumberOfTenant(tenant.id),
  );
  if (!removed) throw platformErrors.noNumber();
  return removed;
}
