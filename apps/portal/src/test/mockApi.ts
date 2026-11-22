import { vi } from "vitest";

/** Answers API calls by "METHOD /path" with the success envelope; anything else gets a 404. */
export function mockApi(routes: Record<string, unknown>) {
  const fetch = vi.fn<typeof globalThis.fetch>(async (input) => {
    const request = input as Request;
    const key = `${request.method} ${new URL(request.url).pathname}`;
    if (!(key in routes)) {
      return Response.json(
        { status: 404, code: "tt_htt_404", message: `Not mocked: ${key}`, traceId: "test" },
        { status: 404 },
      );
    }
    return Response.json({ status: 200, message: "success", data: routes[key] });
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}
