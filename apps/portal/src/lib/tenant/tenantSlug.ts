const PORTAL_DOMAIN = ".turftap.lk";
const DEV_TENANT_PARAM = "tenant";
const DEV_DEFAULT_SLUG = "demo";

/** The tenant comes from the address: `kickoff.turftap.lk` is "kickoff". Locally, `?tenant=` or "demo". */
export function tenantSlugFrom(location: Pick<Location, "hostname" | "search">): string {
  if (location.hostname.endsWith(PORTAL_DOMAIN)) {
    return location.hostname.slice(0, -PORTAL_DOMAIN.length);
  }
  return new URLSearchParams(location.search).get(DEV_TENANT_PARAM) ?? DEV_DEFAULT_SLUG;
}
