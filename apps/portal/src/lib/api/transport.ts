import { client } from "@turftap/contract/client/client";
import { toApiError } from "@turftap/ui";

import { tenantSlugFrom } from "../tenant/tenantSlug";

const TENANT_SLUG_HEADER = "X-Tenant-Slug";
let installed = false;

/** Connects the generated API client to this app: same-origin calls, tenant header, typed errors. */
export function installApiTransport(): void {
  if (installed) return;
  installed = true;
  client.setConfig({ baseUrl: "", throwOnError: true });
  client.interceptors.request.use((request) => {
    request.headers.set(TENANT_SLUG_HEADER, tenantSlugFrom(window.location));
    return request;
  });
  client.interceptors.error.use((error, response) => toApiError(error, response));
}
