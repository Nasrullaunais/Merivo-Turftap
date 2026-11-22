import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "./openapi.json",
  output: { path: "./src/client", clean: true },
  plugins: [
    { name: "@hey-api/client-fetch", baseUrl: false, throwOnError: true },
    { name: "@hey-api/typescript", enums: "javascript" },
    "@hey-api/sdk",
    "@tanstack/react-query",
  ],
});
