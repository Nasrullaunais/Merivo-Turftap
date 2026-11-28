import { config } from "../src/lib/config";
import * as tenantsService from "../src/modules/platform/tenants.service";
import { adminScript } from "./admin-script";

await adminScript("tenant:create", ["slug", "name", "owner phone"], async ([slug, name, phone]) => {
  const tenant = await tenantsService.create({ slug, name, ownerPhone: phone });
  const message =
    `Hi! ${tenant.name} is set up on TurfTap, with you as its Owner. ` +
    `Sign in at ${config.consoleUrl} with this phone number (${tenant.ownerPhone}).`;
  const whatsAppLink = `https://wa.me/${tenant.ownerPhone.slice(1)}?text=${encodeURIComponent(message)}`;
  return [
    `Created tenant "${tenant.slug}" (${tenant.name}) with Owner ${tenant.ownerPhone}.`,
    "Tell the Owner where to sign in. Open this link to send the message on WhatsApp:",
    whatsAppLink,
  ].join("\n");
});
