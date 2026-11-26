import { client } from "@turftap/contract/client/client";
import { toApiError } from "@turftap/ui";

import { getAccessToken } from "../auth/session";
import { tenantSlugFrom } from "../tenant/tenantSlug";

const TENANT_SLUG_HEADER = "X-Tenant-Slug";
let installed = false;

/** Connects the generated API client to this app: same-origin calls, sign-in, tenant header, typed errors. */
export function installApiTransport(): void {
  if (installed) return;
  installed = true;
  client.setConfig({ baseUrl: "", throwOnError: true });
  client.interceptors.request.use((request) => {
    const token = getAccessToken();
    if (token !== undefined) request.headers.set("Authorization", `Bearer ${token}`);
    request.headers.set(TENANT_SLUG_HEADER, tenantSlugFrom(window.location));
    return request;
  });
  client.interceptors.error.use((error, response) => toApiError(error, response));
}
