import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { createQueryClient } from "@turftap/ui";
import { describe, expect, it, vi } from "vitest";

import { mockApi } from "../../test/mockApi";
import { VenueList } from "./VenueList";

const venue = {
  id: 1,
  name: "Kick Off Arena",
  description: "Two indoor futsal courts",
  address: "45 Galle Road, Colombo 03",
  phone: "+94112345678",
  timeZone: "Asia/Colombo",
  openingHours: [],
  active: true,
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-01T00:00:00.000Z",
};

const renderList = () =>
  render(
    <QueryClientProvider client={createQueryClient()}>
      <VenueList />
    </QueryClientProvider>,
  );

describe("POR-02 venue list", () => {
  it("showsTheTenantsVenues", async () => {
    const fetch = mockApi({
      "GET /v1/venues": { content: [venue], page: 0, size: 20, totalElements: 1, totalPages: 1 },
    });
    renderList();
    expect(await screen.findByText("Kick Off Arena")).toBeInTheDocument();
    const request = fetch.mock.calls[0]![0] as Request;
    expect(request.headers.get("X-Tenant-Slug")).toBe("demo");
  });

  it("saysSoWhenThereAreNone", async () => {
    mockApi({
      "GET /v1/venues": { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 },
    });
    renderList();
    expect(await screen.findByText("No venues are open for booking yet.")).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
