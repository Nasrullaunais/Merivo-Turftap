import type { Resource } from "@turftap/contract/client";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { court, gym, tenant, venue } from "../../test/fixtures";
import { byQuery, failure, mockApi } from "../../test/mockApi";
import { page, renderPortal } from "../../test/renderPortal";

// 1:32 AM on Sat 28 Nov in Colombo, before the venues open at 6 AM.
const NOW = "2026-11-27T20:02:00Z";

const court2: Resource = { ...court, id: 4, name: "Futsal Court 2" };
const poolTable: Resource = {
  ...court,
  id: 5,
  name: "Pool Table 1",
  type: "POOL_TABLE",
  price: { amount: 80_000, currency: "LKR" },
};
const everyResource = [court, court2, poolTable];

const photo = (url: string) => ({
  id: 5,
  venueId: venue.id,
  resourceId: null,
  position: 1,
  url,
  createdAt: venue.createdAt,
  updatedAt: venue.updatedAt,
});

/** One venue with two futsal courts and a pool table, and a gym with nothing to rent. */
const api = (overrides: Record<string, unknown> = {}) =>
  mockApi({
    "GET /v1/tenant": tenant,
    "GET /v1/venues": page([venue, gym]),
    "GET /v1/venues/1": venue,
    "GET /v1/photos": page([]),
    "GET /v1/resources": byQuery((query) =>
      page(
        everyResource.filter(
          (one) => !query.has("venueId") || one.venueId === Number(query.get("venueId")),
        ),
      ),
    ),
    "GET /v1/price-rules": page([]),
    ...overrides,
  });

const cardOf = (venueName: string) =>
  screen.getByRole("heading", { name: venueName }).closest("article")!;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("POR-02 venue list", () => {
  it("showsTheTenantsVenues", async () => {
    const fetch = api();
    renderPortal("/");
    expect(await screen.findByRole("heading", { name: "Kick Off Arena" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Peak Fitness" })).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    const request = fetch.mock.calls[0]![0] as Request;
    expect(request.headers.get("X-Tenant-Slug")).toBe("demo");
  });

  it("saysSoWhenThereAreNone", async () => {
    mockApi({ "GET /v1/tenant": tenant, "GET /v1/venues": page([]) });
    renderPortal("/");
    expect(await screen.findByText("No venues are open for booking yet.")).toBeInTheDocument();
  });

  it("VEN-06_showsEachVenuesCoverPhoto", async () => {
    const url = "https://files.example/1/photos/cover.jpg?signature=abc";
    const fetch = api({
      "GET /v1/venues": page([venue]),
      "GET /v1/photos": { ...page([photo(url)]), size: 1, totalElements: 3, totalPages: 3 },
    });
    renderPortal("/");
    expect(await screen.findByAltText("Photo of Kick Off Arena")).toHaveAttribute("src", url);
    const photos = fetch.mock.calls
      .map(([request]) => new URL((request as Request).url))
      .find((address) => address.pathname === "/v1/photos")!;
    expect(Object.fromEntries(photos.searchParams)).toEqual({
      venueId: "1",
      size: "1",
      sort: "position,asc",
    });
  });

  it("saysWhenEachVenueOpens_onItsOwnClock", async () => {
    api();
    renderPortal("/");
    await screen.findByRole("heading", { name: "Kick Off Arena" });
    expect(within(cardOf("Kick Off Arena")).getByText("Opens at 6 AM")).toBeInTheDocument();
  });

  it("eachSportAndTheGym_leadsStraightToItsPage", async () => {
    api();
    renderPortal("/?tenant=demo");
    await screen.findByRole("heading", { name: "Kick Off Arena" });

    const arena = within(cardOf("Kick Off Arena"));
    expect(arena.getByRole("link", { name: "Futsal & cricket" })).toHaveAttribute(
      "href",
      "/venues/1/sports/futsal?tenant=demo",
    );
    expect(arena.getByRole("link", { name: "Pool" })).toHaveAttribute(
      "href",
      "/resources/5?tenant=demo",
    );
    expect(arena.queryByRole("link", { name: "Gym" })).not.toBeInTheDocument();
    expect(within(cardOf("Peak Fitness")).getByRole("link", { name: "Gym" })).toHaveAttribute(
      "href",
      "/venues/3?tenant=demo",
    );
  });

  it("pickingASport_showsOnlyVenuesWithIt_andEverythingBringsThemBack", async () => {
    api();
    const router = renderPortal("/");
    const filter = await screen.findByRole("navigation", { name: "Show venues with" });

    fireEvent.click(within(filter).getByRole("link", { name: "Gym" }));
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Kick Off Arena" })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("heading", { name: "Peak Fitness" })).toBeInTheDocument();
    expect(router.state.location.search).toEqual({ offer: "gym" });

    fireEvent.click(within(filter).getByRole("link", { name: "Everything" }));
    expect(await screen.findByRole("heading", { name: "Kick Off Arena" })).toBeInTheDocument();
  });

  it("resourcesThatFailToLoad_stillShowTheVenues", async () => {
    api({ "GET /v1/resources": failure(500, "tt_htt_500", "Broken") });
    renderPortal("/");
    expect(await screen.findByRole("heading", { name: "Kick Off Arena" })).toBeInTheDocument();
  });
});

describe("POR-02 venue page", () => {
  it("aVenueOpensItsPage_withOneCardPerSport", async () => {
    api({
      "GET /v1/price-rules": byQuery((query) =>
        page(
          query.get("resourceId") === String(court2.id)
            ? [
                {
                  id: 3,
                  resourceId: court2.id,
                  weekdays: [1, 2],
                  startTime: "06:00",
                  endTime: "10:00",
                  price: { amount: 350_000, currency: "LKR" },
                  createdAt: venue.createdAt,
                  updatedAt: venue.updatedAt,
                },
              ]
            : [],
        ),
      ),
    });
    renderPortal("/?tenant=demo");

    fireEvent.click(await screen.findByRole("link", { name: "Kick Off Arena" }));

    expect(
      await screen.findByRole("heading", { name: "Kick Off Arena", level: 1 }),
    ).toBeInTheDocument();
    const sports = screen.getByRole("region", { name: "Book a time" });
    expect(within(sports).getByRole("link", { name: "Futsal & cricket" })).toHaveAttribute(
      "href",
      "/venues/1/sports/futsal?tenant=demo",
    );
    expect(within(sports).getByRole("link", { name: "Pool" })).toHaveAttribute(
      "href",
      "/resources/5?tenant=demo",
    );
    expect(within(sports).queryByText("Futsal Court 1")).not.toBeInTheDocument();
    const futsal = within(
      screen.getByRole("link", { name: "Futsal & cricket" }).closest("article")!,
    );
    expect(await futsal.findByText("LKR 3,500")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Join the gym" })).not.toBeInTheDocument();
  });

  it("aVenueThatIsGone_saysSoAndLeadsHome", async () => {
    mockApi({
      "GET /v1/tenant": tenant,
      "GET /v1/venues/9": failure(404, "tt_ven_001", "Venue 9 was not found"),
      "GET /v1/resources": page([]),
    });
    renderPortal("/venues/9");

    expect(
      await screen.findByRole("heading", { name: "We couldn't find this" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See all venues" })).toBeInTheDocument();
  });
});
