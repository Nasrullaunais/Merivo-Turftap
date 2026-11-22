// Building the document never connects, but the config still wants a database address.
process.env.DATABASE_URL ??= "postgres://unused@localhost/unused";

const { buildOpenApiDocument, OPENAPI_PATH, serialize } = await import("../src/openapi");

await Bun.write(OPENAPI_PATH, serialize(buildOpenApiDocument()));
console.log(`Wrote ${OPENAPI_PATH}`);
