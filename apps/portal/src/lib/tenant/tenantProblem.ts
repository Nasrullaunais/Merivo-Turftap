const TENANT_NOT_FOUND = "tt_plt_001";
const TENANT_OFF = "tt_plt_010";

export type TenantProblem = "notFound" | "notAvailable" | "failed";

/** POR-01, PLA-03: why this portal address can't be shown. */
export function tenantProblemOf(error: { code?: string }): TenantProblem {
  if (error.code === TENANT_NOT_FOUND) return "notFound";
  if (error.code === TENANT_OFF) return "notAvailable";
  return "failed";
}
