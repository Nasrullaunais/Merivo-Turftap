import * as whatsappNumbersService from "../src/modules/platform/whatsapp-numbers.service";
import { adminScript } from "./admin-script";

await adminScript("whatsapp:unlink", ["tenant slug"], async ([tenantSlug]) => {
  const number = await whatsappNumbersService.unlink(tenantSlug);
  return `Unlinked ${number.phone} from tenant "${tenantSlug}"`;
});
