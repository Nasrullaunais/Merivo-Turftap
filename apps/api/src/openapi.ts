import { componentSchemas } from "./lib/resource";
import { RESOURCES } from "./resources";

export const OPENAPI_PATH = new URL("../../../packages/contract/openapi.json", import.meta.url)
  .pathname;

export function buildOpenApiDocument() {
  return {
    openapi: "3.1.0",
    info: {
      title: "TurfTap API",
      version: "1",
      description:
        "Every reply is wrapped as { status, message, data }. Staff send X-Tenant-Id; the " +
        "Customer Portal sends X-Tenant-Slug. Errors carry a code (tt_<area>_<nnn>) and a traceId.",
    },
    components: {
      securitySchemes: { bearerAuth: { type: "http", scheme: "bearer" } },
      schemas: componentSchemas(),
    },
    paths: Object.assign({}, ...RESOURCES.map((resource) => resource.openapi())),
  };
}

export const serialize = (document: object) => `${JSON.stringify(document, null, 2)}\n`;
