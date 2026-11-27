import * as tenantsService from "../src/modules/platform/tenants.service";
import { adminScript } from "./admin-script";

await adminScript("tenant:on", ["slug"], async ([slug]) => {
  await tenantsService.setActive(slug, true);
  return `Turned tenant "${slug}" on`;
});
