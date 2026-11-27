import * as tenantsService from "../src/modules/platform/tenants.service";
import { adminScript } from "./admin-script";

await adminScript("tenant:off", ["slug"], async ([slug]) => {
  await tenantsService.setActive(slug, false);
  return `Turned tenant "${slug}" off: staff can look but not change anything; portal and Assistant are closed`;
});
