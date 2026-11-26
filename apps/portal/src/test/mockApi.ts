import { vi } from "vitest";

const FAILURE = Symbol("failure");
const IN_TURN = Symbol("inTurn");
const BY_QUERY = Symbol("byQuery");

/** An error reply, shaped like the API's error envelope. */
export const failure = (status: number, code: string, message = "Refused") => ({
  [FAILURE]: true as const,
  status,
  code,
  message,
});

/** One reply per call, in order; the last one repeats. */
export const inTurn = (...replies: unknown[]) => ({ [IN_TURN]: replies });

const has = (value: unknown, mark: symbol) =>
  typeof value === "object" && value !== null && mark in value;

/** A reply that depends on the query, such as `?date=` or `?slots=`. */
export const byQuery = (reply: (query: URLSearchParams) => unknown) => ({ [BY_QUERY]: reply });

/**
 * Answers API calls by "METHOD /path" with the success envelope, or the error envelope for a
 * `failure()`. Anything not listed gets a 404.
 */
export function mockApi(routes: Record<string, unknown>) {
  const calls = new Map<string, number>();
  const fetch = vi.fn<typeof globalThis.fetch>(async (input) => {
    const request = input as Request;
    const key = `${request.method} ${new URL(request.url).pathname}`;
    if (!(key in routes)) {
      return Response.json(
        { status: 404, code: "tt_htt_404", message: `Not mocked: ${key}`, traceId: "test" },
        { status: 404 },
      );
    }
    const count = calls.get(key) ?? 0;
    calls.set(key, count + 1);
    const route = routes[key];
    const replies = has(route, IN_TURN) ? (route as ReturnType<typeof inTurn>)[IN_TURN] : [route];
    const turn = replies[Math.min(count, replies.length - 1)];
    const reply = has(turn, BY_QUERY)
      ? (turn as ReturnType<typeof byQuery>)[BY_QUERY](new URL(request.url).searchParams)
      : turn;
    if (has(reply, FAILURE)) {
      const { status, code, message } = reply as ReturnType<typeof failure>;
      return Response.json({ status, code, message, traceId: "test" }, { status });
    }
    return Response.json({ status: 200, message: "success", data: reply });
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}
