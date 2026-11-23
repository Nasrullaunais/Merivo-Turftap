// Building the document never connects or signs anyone in, but the config still wants these.
process.env.DATABASE_URL ??= "postgres://unused@localhost/unused";
process.env.ASSISTANT_API_KEY ??= "unused-assistant-key-32-characters";

const { buildOpenApiDocument, OPENAPI_PATH, serialize } = await import("../src/openapi");

await Bun.write(OPENAPI_PATH, serialize(buildOpenApiDocument()));
console.log(`Wrote ${OPENAPI_PATH}`);
