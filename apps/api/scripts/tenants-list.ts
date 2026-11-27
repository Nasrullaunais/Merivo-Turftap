import * as tenantsService from "../src/modules/platform/tenants.service";
import { adminScript } from "./admin-script";

await adminScript("tenants:list", [], async () => {
  const rows = (await tenantsService.list()).map((tenant) => ({
    slug: tenant.slug,
    name: tenant.name,
    status: tenant.active ? "on" : "off",
    "bookings this month": tenant.bookingsThisMonth,
  }));
  if (!rows.length) return "No tenants yet";
  console.table(rows);
  return `${rows.length} tenant(s). "This month" is the calendar month on Sri Lankan clocks`;
});
