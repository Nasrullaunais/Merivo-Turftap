import * as tenantsService from "../src/modules/platform/tenants.service";
import { adminScript } from "./admin-script";

await adminScript("admin:add", ["phone"], async ([phone]) => {
  const user = await tenantsService.addPlatformAdmin(phone);
  return `${user.phone} is now a Platform Admin`;
});
