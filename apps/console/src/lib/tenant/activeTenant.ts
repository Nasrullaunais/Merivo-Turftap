import type { Me, MyTenant, Permission } from "@turftap/contract";

const STORAGE_KEY = "turftap.activeTenantId";

/** The tenant a staff member is working in (SIG-02). Kept per browser tab. */
export function getActiveTenantId(): number | undefined {
  const stored = sessionStorage.getItem(STORAGE_KEY);
  return stored ? Number(stored) : undefined;
}

export function setActiveTenantId(tenantId: number): void {
  sessionStorage.setItem(STORAGE_KEY, String(tenantId));
}

export function clearActiveTenantId(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

export type TenantChoice =
  | { kind: "open"; tenant: MyTenant }
  | { kind: "pick" }
  | { kind: "noAccess" }
  | { kind: "noTenant" };

/** SIG-02: one tenant opens straight away, several need a pick, none means no access. */
export function chooseTenant(me: Me): TenantChoice {
  const activeTenantId = getActiveTenantId();
  const active = me.tenants.find((tenant) => tenant.id === activeTenantId);
  if (active) return { kind: "open", tenant: active };
  if (me.tenants.length === 1) return { kind: "open", tenant: me.tenants[0]! };
  if (me.tenants.length > 1) return { kind: "pick" };
  return me.isPlatformAdmin ? { kind: "noTenant" } : { kind: "noAccess" };
}

/** SIG-05: whether the user's role in this tenant allows it, so pages the API would refuse stay hidden. */
export const can = (tenant: MyTenant | undefined, permission: Permission): boolean =>
  tenant?.permissions.includes(permission) ?? false;
