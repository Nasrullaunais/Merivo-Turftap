const DEV_TENANT_PARAM = "tenant";
const DEV_DEFAULT_SLUG = "demo";
const IP_ADDRESS = /^[\d.]+$|:/;

/**
 * The tenant is the first part of the address: `kickoff.turftap.lk` is "kickoff". The portal is
 * only served on tenant addresses, so the domain itself doesn't matter. Locally, `?tenant=` or "demo".
 */
export function tenantSlugFrom(location: Pick<Location, "hostname" | "search">): string {
  const { hostname } = location;
  if (hostname.includes(".") && !IP_ADDRESS.test(hostname)) return hostname.split(".")[0]!;
  return new URLSearchParams(location.search).get(DEV_TENANT_PARAM) ?? DEV_DEFAULT_SLUG;
}
