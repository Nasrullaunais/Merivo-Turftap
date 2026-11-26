import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { court, tenant, venue } from "../../test/fixtures";
import { failure, mockApi } from "../../test/mockApi";
import { page, renderPortal } from "../../test/renderPortal";

const photo = (url: string) => ({
  id: 5,
  venueId: venue.id,
  resourceId: null,
  position: 1,
  url,
  createdAt: venue.createdAt,
  updatedAt: venue.updatedAt,
});

afterEach(() => vi.unstubAllGlobals());

describe("POR-02 venue list", () => {
  it("showsTheTenantsVenues", async () => {
    const fetch = mockApi({
      "GET /v1/tenant": tenant,
      "GET /v1/venues": page([venue]),
      "GET /v1/photos": page([]),
    });
    renderPortal("/");
    expect(await screen.findByText("Kick Off Arena")).toBeInTheDocument();
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
    const fetch = mockApi({
      "GET /v1/tenant": tenant,
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

  it("aVenueOpensItsPage_withWhatItRentsAndThePrices", async () => {
    mockApi({
      "GET /v1/tenant": tenant,
      "GET /v1/venues": page([venue]),
      "GET /v1/venues/1": venue,
      "GET /v1/photos": page([]),
      "GET /v1/resources": page([court]),
      "GET /v1/price-rules": page([
        {
          id: 3,
          resourceId: court.id,
          weekdays: [5, 6],
          startTime: "18:00",
          endTime: "22:00",
          price: { amount: 600_000, currency: "LKR" },
          createdAt: venue.createdAt,
          updatedAt: venue.updatedAt,
        },
      ]),
    });
    const router = renderPortal("/?tenant=demo");

    fireEvent.click(await screen.findByRole("link", { name: /Kick Off Arena/ }));

    expect(await screen.findByRole("heading", { name: "Kick Off Arena" })).toBeInTheDocument();
    const card = await screen.findByRole("link", { name: /Futsal Court 1/ });
    expect(card).toHaveAttribute("href", "/resources/2?tenant=demo");
    expect(await screen.findByText("LKR 4,500 – LKR 6,000")).toBeInTheDocument();
    expect(screen.getByText("per hour")).toBeInTheDocument();
    expect(router.state.location.search).toEqual({ tenant: "demo" });
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
