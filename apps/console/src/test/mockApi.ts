import { vi } from "vitest";

type Answer = unknown | ((request: Request) => Response);

/** Answers API calls by "METHOD /path" with the success envelope; anything else gets a 404. */
export function mockApi(routes: Record<string, Answer>) {
  const fetch = vi.fn<typeof globalThis.fetch>(async (input) => {
    const request = input as Request;
    const key = `${request.method} ${new URL(request.url).pathname}`;
    if (!(key in routes)) return apiError(404, "tt_htt_404", `Not mocked: ${key}`);
    const answer = routes[key];
    if (typeof answer === "function") return answer(request);
    return Response.json({ status: 200, message: "success", data: answer });
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

/** The API's error envelope, as `lib/http/error-handler.ts` sends it. */
export const apiError = (status: number, code: string, message: string) =>
  Response.json({ status, code, message, traceId: "test" }, { status });
