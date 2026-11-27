import type { Resource } from "@turftap/contract/client";
import { screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { court, slot, tenant, venue } from "../../test/fixtures";
import { byQuery, mockApi } from "../../test/mockApi";
import { page, renderPortal } from "../../test/renderPortal";

// 1:32 AM on Sat 28 Nov in Colombo.
const NOW = "2026-11-27T20:02:00Z";
const TODAY = "2026-11-28";

const court2: Resource = { ...court, id: 4, name: "Futsal Court 2" };
const poolTable: Resource = { ...court, id: 5, name: "Pool Table 1", type: "POOL_TABLE" };

/** Three free hours on each court today, from 4:30 PM in Colombo. */
const freeToday = ["2026-11-28T11:00:00Z", "2026-11-28T12:00:00Z", "2026-11-28T13:00:00Z"].map(
  (startsAt) => slot(startsAt, 4_500),
);

const api = () =>
  mockApi({
    "GET /v1/tenant": tenant,
    "GET /v1/venues/1": venue,
    "GET /v1/photos": page([]),
    "GET /v1/resources": page([court, court2, poolTable]),
    "GET /v1/price-rules": page([]),
    "GET /v1/availability": byQuery((query) => page(query.get("date") === TODAY ? freeToday : [])),
  });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("POR-02 a sport at a venue", () => {
  it("listsItsCourts_eachLeadingToItsTimes", async () => {
    api();
    renderPortal("/venues/1/sports/futsal?tenant=demo");

    expect(
      await screen.findByRole("heading", { name: "Futsal & cricket", level: 1 }),
    ).toBeInTheDocument();
    const courts = screen.getByRole("region", { name: "Pick a court" });
    expect(within(courts).getByRole("link", { name: "Futsal Court 1" })).toHaveAttribute(
      "href",
      "/resources/2?tenant=demo",
    );
    expect(within(courts).getByRole("link", { name: "Futsal Court 2" })).toHaveAttribute(
      "href",
      "/resources/4?tenant=demo",
    );
    expect(within(courts).queryByText("Pool Table 1")).not.toBeInTheDocument();
  });

  it("saysWhatIsStillFreeToday_forTheSportAndEachCourt", async () => {
    api();
    renderPortal("/venues/1/sports/futsal");

    expect(await screen.findByText("Free from 4:30 PM")).toBeInTheDocument();
    const courts = screen.getByRole("region", { name: "Pick a court" });
    expect(await within(courts).findAllByText("Only 3 left today")).toHaveLength(2);
  });

  it("aSportWithOneTable_goesStraightToItsTimes", async () => {
    api();
    const router = renderPortal("/venues/1/sports/pool");

    await waitFor(() => expect(router.state.location.pathname).toBe("/resources/5"));
  });

  it("aSportTheVenueDoesNotOffer_saysSo", async () => {
    api();
    renderPortal("/venues/1/sports/golf");

    expect(
      await screen.findByRole("heading", { name: "Nothing to book here" }),
    ).toBeInTheDocument();
  });
});
