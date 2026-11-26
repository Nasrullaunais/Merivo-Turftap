import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { court, slot, tenant, venue } from "../../test/fixtures";
import { byQuery, mockApi } from "../../test/mockApi";
import { page, renderPortal } from "../../test/renderPortal";

// 15:00 on Friday in New York is already 01:30 on Saturday 28 November in Colombo.
const NOW = "2026-11-27T20:00:00Z";
const COLOMBO_TODAY = "2026-11-28";
// 18:00, 19:00 and 20:00 in Colombo (UTC+5:30).
const AT_18 = "2026-11-28T12:30:00.000Z";
const AT_1830 = "2026-11-28T13:00:00.000Z";
const AT_19 = "2026-11-28T13:30:00.000Z";
const AT_20 = "2026-11-28T14:30:00.000Z";

const api = (overrides: Record<string, unknown> = {}) =>
  mockApi({
    "GET /v1/tenant": tenant,
    "GET /v1/resources/2": court,
    "GET /v1/venues/1": venue,
    "GET /v1/photos": page([]),
    "GET /v1/price-rules": page([]),
    "GET /v1/closed-dates": page([]),
    "GET /v1/availability": page([slot(AT_18, 4500), slot(AT_19, 4500, false)]),
    ...overrides,
  });

const timeButton = (name: RegExp) => screen.findByRole("button", { name });
const block = () => screen.findByRole("group", { name: "Your time" });
const longer = () => screen.findByRole("button", { name: "Longer by 1 hour" });
const shorter = () => screen.getByRole("button", { name: "Shorter by 1 hour" });
/** + stays off until the server says the longer time is free. */
const enabled = async (button: Promise<HTMLElement>) => {
  const found = await button;
  await waitFor(() => expect(found).toBeEnabled());
  return found;
};
const bookBar = () => screen.getByRole("region", { name: "Book" });
const signInAsked = () => screen.findByRole("heading", { name: "What's your phone number?" });
/** The booking page sign-in returns to, with the chosen time in its address. */
const bookingKept = (router: ReturnType<typeof renderPortal>) => {
  const back = new URL(String(router.state.location.search.back), window.location.origin);
  expect(back.pathname).toBe("/book");
  return router.options.parseSearch(back.search);
};

const queryOf = (fetch: ReturnType<typeof mockApi>, path: string) =>
  fetch.mock.calls
    .map(([request]) => new URL((request as Request).url))
    .filter((address) => address.pathname === path)
    .map((address) => Object.fromEntries(address.searchParams));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("POR-02, BKG-01 free slots of a resource", () => {
  it("newYorkBrowser_seesTheVenuesDayAndClock", async () => {
    const fetch = api();
    renderPortal("/resources/2");

    expect(await timeButton(/^6:00\u00a0PM/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Today, Saturday 28 November" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(queryOf(fetch, "/v1/availability")[0]).toMatchObject({
      resourceId: "2",
      date: COLOMBO_TODAY,
    });
  });

  it("showsFreeSlotsWithPrice_andTakenOnesCantBePicked", async () => {
    api();
    renderPortal("/resources/2");

    const free = await timeButton(/^6:00\u00a0PM/);
    expect(free).toHaveAccessibleName("6:00\u00a0PM, LKR\u00a04,500");
    expect(free).toBeEnabled();
    const taken = await timeButton(/^7:00\u00a0PM/);
    expect(taken).toHaveAccessibleName("7:00\u00a0PM, Taken");
    expect(taken).toBeDisabled();
    expect(screen.getByText("1 free")).toBeInTheDocument();
  });

  it("showsThePriceRulePriceOfEachSlot", async () => {
    api({
      "GET /v1/availability": page([slot(AT_18, 4500), slot(AT_19, 6000)]),
    });
    renderPortal("/resources/2");

    expect(await timeButton(/^6:00\u00a0PM/)).toHaveAccessibleName("6:00\u00a0PM, LKR\u00a04,500");
    expect(await timeButton(/^7:00\u00a0PM/)).toHaveAccessibleName("7:00\u00a0PM, LKR\u00a06,000");
  });

  it("closedDate_showsClosedWithItsReason", async () => {
    api({
      "GET /v1/closed-dates": page([
        {
          id: 9,
          venueId: venue.id,
          date: COLOMBO_TODAY,
          reason: "Poya day",
          createdAt: venue.createdAt,
          updatedAt: venue.updatedAt,
        },
      ]),
      "GET /v1/availability": page([slot(AT_18, 4500, false)]),
    });
    renderPortal("/resources/2");

    expect(await screen.findByRole("heading", { name: "Closed" })).toBeInTheDocument();
    expect(screen.getByText("Poya day")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^6:00\u00a0PM/ })).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Today, Saturday 28 November, Closed" }),
    ).toBeInTheDocument();
  });

  it("pickingAnotherDay_loadsThatDaysSlots", async () => {
    const fetch = api();
    const router = renderPortal("/resources/2");

    fireEvent.click(await screen.findByRole("button", { name: "Sunday 29 November" }));

    await waitFor(() =>
      expect(queryOf(fetch, "/v1/availability").map((query) => query.date)).toContain("2026-11-29"),
    );
    expect(router.state.location.search).toMatchObject({ date: "2026-11-29" });
  });

  it("pickingATime_showsOneBlockFromStartToEnd_andBookLeadsOn", async () => {
    api();
    const router = renderPortal("/resources/2");

    fireEvent.click(await timeButton(/^6:00 PM/));

    const chosen = await block();
    expect(within(chosen).getByText("6:00 PM")).toBeInTheDocument();
    expect(within(chosen).getByText("7:00 PM")).toBeInTheDocument();
    expect(within(chosen).getByText("1 hour")).toBeInTheDocument();
    expect(await within(chosen).findByText("LKR 4,500")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^6:00 PM/ })).not.toBeInTheDocument();

    fireEvent.click(within(chosen).getByRole("button", { name: "Book" }));

    expect(await signInAsked()).toBeInTheDocument();
    expect(bookingKept(router)).toMatchObject({
      resourceId: court.id,
      startsAt: AT_18,
      count: 1,
    });
  });

  it("BKG-02 plus_mergesTheNextHourIntoTheBlock_withTheServersTotal", async () => {
    const fetch = api({
      "GET /v1/availability": byQuery((query) =>
        query.get("slots") === "3"
          ? page([slot(AT_18, 4500, false)])
          : query.get("slots") === "2"
            ? page([slot(AT_18, 10_500), slot(AT_19, 12_000)])
            : page([slot(AT_18, 4500), slot(AT_19, 6000), slot(AT_20, 6000)]),
      ),
    });
    const router = renderPortal("/resources/2");

    fireEvent.click(await timeButton(/^6:00 PM/));
    fireEvent.click(await enabled(longer()));

    const chosen = await block();
    expect(within(chosen).getByText("8:00 PM")).toBeInTheDocument();
    expect(within(chosen).getByText("2 hours")).toBeInTheDocument();
    expect(await within(chosen).findByText("LKR 10,500")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^7:00 PM/ })).not.toBeInTheDocument();
    expect(await timeButton(/^8:00 PM/)).toBeEnabled();
    expect(queryOf(fetch, "/v1/availability")).toContainEqual(
      expect.objectContaining({ date: COLOMBO_TODAY, slots: "2" }),
    );
    expect(await within(chosen).findByText("The time right after isn't free.")).toBeInTheDocument();
    expect(await longer()).toBeDisabled();

    fireEvent.click(within(chosen).getByRole("button", { name: "Book" }));

    await signInAsked();
    expect(bookingKept(router)).toMatchObject({ startsAt: AT_18, count: 2 });
  });

  it("minus_letsTheMergedHourGoAgain", async () => {
    api({
      "GET /v1/availability": page([slot(AT_18, 4500), slot(AT_19, 4500), slot(AT_20, 4500)]),
    });
    renderPortal("/resources/2");

    fireEvent.click(await timeButton(/^6:00 PM/));
    expect(shorter()).toBeDisabled();
    fireEvent.click(await enabled(longer()));
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /^7:00 PM/ })).not.toBeInTheDocument(),
    );

    fireEvent.click(shorter());

    expect(await timeButton(/^7:00 PM/)).toBeEnabled();
    expect(within(await block()).getByText("1 hour")).toBeInTheDocument();
    expect(within(await block()).getByText("7:00 PM")).toBeInTheDocument();
  });

  it("courts_growUpToThreeHoursOnline", async () => {
    api({ "GET /v1/availability": page([slot(AT_18, 4500)]) });
    renderPortal("/resources/2");

    fireEvent.click(await timeButton(/^6:00 PM/));
    fireEvent.click(await enabled(longer()));
    fireEvent.click(await enabled(longer()));

    const chosen = await block();
    expect(within(chosen).getByText("3 hours")).toBeInTheDocument();
    expect(
      await within(chosen).findByText("3 hours is the longest you can book online."),
    ).toBeInTheDocument();
    expect(await longer()).toBeDisabled();
  });

  it("halfHourTables_growByHalfAnHour_upToTwoHours", async () => {
    api({
      "GET /v1/resources/2": {
        ...court,
        type: "POOL_TABLE",
        slotMinutes: 30,
        startIntervalMinutes: 30,
      },
      "GET /v1/availability": page([slot(AT_18, 1500)]),
    });
    renderPortal("/resources/2");

    fireEvent.click(await timeButton(/^6:00 PM/));
    for (let step = 0; step < 3; step++) {
      fireEvent.click(await enabled(screen.findByRole("button", { name: "Longer by 30 minutes" })));
    }

    const chosen = await block();
    expect(within(chosen).getByText("2 hours")).toBeInTheDocument();
    expect(within(chosen).getByText("8:00 PM")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Longer by 30 minutes" })).toBeDisabled();
  });

  it("halfHourStarts_theStartInsideTheBlockMergesIntoIt", async () => {
    api({
      "GET /v1/availability": page([
        slot(AT_18, 4500),
        slot(AT_1830, 4500),
        slot(AT_19, 4500),
        slot(AT_20, 4500),
      ]),
    });
    renderPortal("/resources/2");

    fireEvent.click(await timeButton(/^6:00 PM/));

    await block();
    expect(screen.queryByRole("button", { name: /^6:30 PM/ })).not.toBeInTheDocument();
    expect(await timeButton(/^7:00 PM/)).toBeEnabled();
    expect(within(await block()).getByText("7:00 PM")).toBeInTheDocument();
  });

  it("tappingAnotherTime_movesTheBlock_backToOneSlot", async () => {
    api({
      "GET /v1/availability": page([slot(AT_18, 4500), slot(AT_19, 4500), slot(AT_20, 4500)]),
    });
    renderPortal("/resources/2");

    fireEvent.click(await timeButton(/^6:00 PM/));
    fireEvent.click(await enabled(longer()));
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /^7:00 PM/ })).not.toBeInTheDocument(),
    );
    fireEvent.click(await timeButton(/^8:00 PM/));

    expect(await timeButton(/^6:00 PM/)).toBeEnabled();
    expect(await timeButton(/^7:00 PM/)).toBeEnabled();
    expect(within(await block()).getByText("1 hour")).toBeInTheDocument();
    expect(within(await block()).getByText("9:00 PM")).toBeInTheDocument();
  });

  it("theBlocksX_putsTheTimeBackAsATile", async () => {
    api();
    renderPortal("/resources/2");

    fireEvent.click(await timeButton(/^6:00\u00a0PM/));
    fireEvent.click(within(await block()).getByRole("button", { name: "Clear" }));

    expect(await timeButton(/^6:00\u00a0PM/)).toBeEnabled();
    expect(screen.queryByRole("group", { name: "Your time" })).not.toBeInTheDocument();
  });

  it("bookBar_showsOnlyWhileTheBlockIsScrolledAway", async () => {
    const watching: ((entries: Partial<IntersectionObserverEntry>[]) => void)[] = [];
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(report: (entries: Partial<IntersectionObserverEntry>[]) => void) {
          watching.push(report);
        }
        observe() {}
        disconnect() {}
      },
    );
    api();
    renderPortal("/resources/2");

    fireEvent.click(await timeButton(/^6:00\u00a0PM/));
    await block();
    expect(bookBar().closest("[inert]")).not.toBeNull();

    act(() => watching.at(-1)!([{ intersectionRatio: 0 }]));

    expect(bookBar().closest("[inert]")).toBeNull();
    expect(within(bookBar()).getByText("6:00 PM – 7:00 PM")).toBeInTheDocument();
    expect(within(bookBar()).getByText(/Sat 28 Nov/)).toBeInTheDocument();

    act(() => watching.at(-1)!([{ intersectionRatio: 1 }]));

    expect(bookBar().closest("[inert]")).not.toBeNull();
  });
});
