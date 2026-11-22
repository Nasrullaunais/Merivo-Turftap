import { client } from "@turftap/contract/client/client";
import { toApiError } from "@turftap/ui";

import { getActiveTenantId } from "../tenant/activeTenant";

const TENANT_ID_HEADER = "X-Tenant-Id";
let installed = false;

/** Connects the generated API client to this app: same-origin calls, tenant header, typed errors. */
export function installApiTransport(): void {
  if (installed) return;
  installed = true;
  client.setConfig({ baseUrl: "", throwOnError: true });
  client.interceptors.request.use((request) => {
    const tenantId = getActiveTenantId();
    if (tenantId !== undefined) request.headers.set(TENANT_ID_HEADER, String(tenantId));
    return request;
  });
  client.interceptors.error.use((error, response) => toApiError(error, response));
}
