import { startJobs, stopJobs } from "../src/lib/jobs";
import * as tenantsService from "../src/modules/platform/tenants.service";
import { adminScript } from "./admin-script";

await adminScript("tenant:create", ["slug", "name", "owner phone"], async ([slug, name, phone]) => {
  // The welcome is queued with the tenant; the API's job worker sends it.
  await startJobs({ work: false });
  try {
    const tenant = await tenantsService.create({ slug, name, ownerPhone: phone });
    return `Created tenant "${tenant.slug}" (${tenant.name}). Welcome queued to Owner ${tenant.ownerPhone}`;
  } finally {
    await stopJobs();
  }
});
