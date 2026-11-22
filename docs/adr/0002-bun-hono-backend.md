# Backend runs on Bun with Hono

The backend is TypeScript on Bun (runtime and package manager), using Hono for HTTP, Zod for input checks and Drizzle for SQL. One language across backend and frontend lets the same schemas check a form in React and a request on the server. Bun is young, so we only pick libraries that also run on Node (Hono, Drizzle, pg-boss). If a Bun bug ever blocks us, moving to Node is a Dockerfile change, not a rewrite.
