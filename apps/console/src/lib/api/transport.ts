import { client } from "@turftap/contract/client/client";
import { toApiError } from "@turftap/ui";

import { getAccessToken } from "../auth/session";
import { getActiveTenantId } from "../tenant/activeTenant";

const TENANT_ID_HEADER = "X-Tenant-Id";
// About the person, not a tenant: a stale tenant header would make the API refuse it.
const PATHS_WITHOUT_TENANT = new Set(["/v1/me"]);
let installed = false;

/** Connects the generated API client to this app: same-origin calls, sign-in, tenant header, typed errors. */
export function installApiTransport(): void {
  if (installed) return;
  installed = true;
  client.setConfig({ baseUrl: "", throwOnError: true });
  client.interceptors.request.use((request) => {
    const token = getAccessToken();
    if (token !== undefined) request.headers.set("Authorization", `Bearer ${token}`);
    const tenantId = getActiveTenantId();
    const path = new URL(request.url).pathname;
    if (tenantId !== undefined && !PATHS_WITHOUT_TENANT.has(path)) {
      request.headers.set(TENANT_ID_HEADER, String(tenantId));
    }
    return request;
  });
  client.interceptors.error.use((error, response) => toApiError(error, response));
}
