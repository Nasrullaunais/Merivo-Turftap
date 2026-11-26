import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { createQueryClient } from "@turftap/ui";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createAppRouter } from "../router";
import { failure, inTurn, mockApi } from "../test/mockApi";

const PHONE_WIDTH_PX = 360;
const tenant = { slug: "demo", name: "Kick Off Sports" };
const noVenues = { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 };

function renderPortal() {
  const queryClient = createQueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={createAppRouter()} context={{ queryClient }} />
    </QueryClientProvider>,
  );
}

const requestedPaths = (fetch: ReturnType<typeof mockApi>) =>
  fetch.mock.calls.map(([request]) => new URL((request as Request).url).pathname);

beforeEach(() => {
  window.innerWidth = PHONE_WIDTH_PX;
  window.dispatchEvent(new Event("resize"));
});
afterEach(() => vi.unstubAllGlobals());

describe("POR-01, POR-05 portal shell at phone width", () => {
  it("showsTheTenantNameOnTopAndOpensThePage", async () => {
    mockApi({ "GET /v1/tenant": tenant, "GET /v1/venues": noVenues });
    renderPortal();

    const topBar = await screen.findByRole("banner");
    expect(await within(topBar).findByText("Kick Off Sports")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Our venues" })).toBeInTheDocument();
    expect(document.title).toBe("Kick Off Sports");
  });

  it("unknownAddress_showsVenueNotFound", async () => {
    const fetch = mockApi({
      "GET /v1/tenant": failure(404, "tt_plt_001", "This venue address was not found"),
    });
    renderPortal();

    expect(
      await screen.findByRole("heading", { name: "We couldn't find this venue" }),
    ).toBeInTheDocument();
    expect(screen.getByText("demo.turftap.lk")).toBeInTheDocument();
    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    expect(requestedPaths(fetch)).toEqual(["/v1/tenant"]);
  });

  it("PLA-03 tenantOff_showsNotAvailable", async () => {
    const fetch = mockApi({
      "GET /v1/tenant": failure(403, "tt_plt_010", "This venue is not available right now"),
    });
    renderPortal();

    expect(
      await screen.findByRole("heading", { name: "Not available right now" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
    expect(requestedPaths(fetch)).toEqual(["/v1/tenant"]);
  });

  it("noConnection_offersTryAgainAndOpensWhenItWorks", async () => {
    const down = failure(503, "tt_htt_503", "Unavailable");
    mockApi({
      // The first try and the two automatic retries fail; the customer's own try works.
      "GET /v1/tenant": inTurn(down, down, down, tenant),
      "GET /v1/venues": noVenues,
    });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderPortal();
    await act(() => vi.runAllTimersAsync());
    vi.useRealTimers();
    expect(screen.getByRole("heading", { name: "We couldn't connect" })).toBeInTheDocument();

    fireEvent.click(await screen.findByRole("button", { name: "Try again" }));

    const topBar = await screen.findByRole("banner");
    expect(await within(topBar).findByText("Kick Off Sports")).toBeInTheDocument();
  });
});
