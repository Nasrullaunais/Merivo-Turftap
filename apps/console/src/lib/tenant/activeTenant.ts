const STORAGE_KEY = "turftap.activeTenantId";

/** The tenant a staff member is working in (SIG-02). Kept per browser tab. */
export function getActiveTenantId(): number | undefined {
  const stored = sessionStorage.getItem(STORAGE_KEY);
  return stored ? Number(stored) : undefined;
}

export function setActiveTenantId(tenantId: number): void {
  sessionStorage.setItem(STORAGE_KEY, String(tenantId));
}
