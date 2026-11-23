import { describe, expect, it } from "bun:test";

import {
  createTenant,
  linkWhatsAppNumber,
  uniquePhone,
  uniquePhoneNumberId,
} from "../../test/fixtures";
import * as whatsappNumbersService from "./whatsapp-numbers.service";

/** "+94701234567" the way a person types it: "070 123 4567". */
const typedLocally = (phone: string) =>
  `0${phone.slice(3, 5)} ${phone.slice(5, 8)} ${phone.slice(8)}`;

describe("PLA-02 linking WhatsApp numbers", () => {
  it("link_storesThePhoneInFullAndMakesItTheTenantsNumber", async () => {
    const tenant = await createTenant();
    const phone = uniquePhone();
    const phoneNumberId = uniquePhoneNumberId();
    await whatsappNumbersService.link({
      tenantSlug: tenant.slug,
      phoneNumberId: ` ${phoneNumberId} `,
      phone: typedLocally(phone),
    });
    expect(await whatsappNumbersService.numberOfTenant(tenant.id)).toMatchObject({
      tenantId: tenant.id,
      phoneNumberId,
      phone,
    });
  });

  it("numberOfTenant_isUndefinedForATenantWithoutOne", async () => {
    const tenant = await createTenant();
    expect(await whatsappNumbersService.numberOfTenant(tenant.id)).toBeUndefined();
  });

  it("link_refusesANumberAlreadyLinkedToAnotherTenant", async () => {
    const linked = await linkWhatsAppNumber(await createTenant());
    const other = await createTenant();
    const samePhoneNumberId = { phoneNumberId: linked.phoneNumberId, phone: uniquePhone() };
    const samePhone = { phoneNumberId: uniquePhoneNumberId(), phone: linked.phone };
    for (const number of [samePhoneNumberId, samePhone]) {
      await expect(
        whatsappNumbersService.link({ tenantSlug: other.slug, ...number }),
      ).rejects.toMatchObject({
        status: 409,
        code: "tt_plt_007",
        message: "This WhatsApp number is already linked to a tenant",
      });
    }
    expect(await whatsappNumbersService.numberOfTenant(other.id)).toBeUndefined();
  });

  it("link_refusesASecondNumberForTheSameTenant", async () => {
    const tenant = await createTenant();
    const first = await linkWhatsAppNumber(tenant);
    await expect(linkWhatsAppNumber(tenant)).rejects.toMatchObject({
      status: 409,
      code: "tt_plt_008",
    });
    expect((await whatsappNumbersService.numberOfTenant(tenant.id))?.id).toBe(first.id);
  });

  it("link_refusesAnUnknownTenantOrBadInput", async () => {
    const good = { phoneNumberId: uniquePhoneNumberId(), phone: uniquePhone() };
    await expect(
      whatsappNumbersService.link({ tenantSlug: "no-such-tenant", ...good }),
    ).rejects.toMatchObject({ status: 404, code: "tt_plt_001" });

    const tenant = await createTenant();
    const reply = whatsappNumbersService.link({
      tenantSlug: tenant.slug,
      phoneNumberId: "abc",
      phone: "12",
    });
    await expect(reply).rejects.toMatchObject({
      status: 400,
      fieldErrors: [
        expect.objectContaining({ field: "phoneNumberId" }),
        expect.objectContaining({ field: "phone" }),
      ],
    });
  });

  it("unlink_freesTheNumberForAnotherTenant", async () => {
    const first = await createTenant();
    const number = await linkWhatsAppNumber(first);
    await whatsappNumbersService.unlink(first.slug);
    expect(await whatsappNumbersService.numberOfTenant(first.id)).toBeUndefined();

    const second = await createTenant();
    const { phoneNumberId, phone } = number;
    await whatsappNumbersService.link({ tenantSlug: second.slug, phoneNumberId, phone });
    expect(await whatsappNumbersService.numberOfTenant(second.id)).toMatchObject({ phone });
  });

  it("unlink_refusesATenantWithNoNumber", async () => {
    const tenant = await createTenant();
    await expect(whatsappNumbersService.unlink(tenant.slug)).rejects.toMatchObject({
      status: 404,
      code: "tt_plt_009",
    });
  });
});
