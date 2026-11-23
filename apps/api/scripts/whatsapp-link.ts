import * as whatsappNumbersService from "../src/modules/platform/whatsapp-numbers.service";
import { adminScript } from "./admin-script";

await adminScript(
  "whatsapp:link",
  ["tenant slug", "Meta phone number id", "phone"],
  async ([tenantSlug, phoneNumberId, phone]) => {
    const number = await whatsappNumbersService.link({ tenantSlug, phoneNumberId, phone });
    return `Linked ${number.phone} (Meta id ${number.phoneNumberId}) to tenant "${tenantSlug}"`;
  },
);
