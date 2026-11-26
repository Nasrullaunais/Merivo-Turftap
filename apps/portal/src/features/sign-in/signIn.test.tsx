import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getAccessToken, signInForTesting } from "../../lib/auth/session";
import { court, customer, me, slot, tenant, venue } from "../../test/fixtures";
import { failure, inTurn, mockApi } from "../../test/mockApi";
import { page, renderPortal } from "../../test/renderPortal";

const AT_18 = "2026-11-28T12:30:00.000Z";
const BOOKING = `/book?resourceId=2&startsAt=${encodeURIComponent(AT_18)}&count=1`;

const api = (overrides: Record<string, unknown> = {}) =>
  mockApi({
    "GET /v1/tenant": tenant,
    "GET /v1/me": me,
    "GET /v1/customers": page([customer]),
    "GET /v1/resources/2": court,
    "GET /v1/venues/1": venue,
    "GET /v1/photos": page([]),
    "GET /v1/availability": page([slot(AT_18, 4500)]),
    ...overrides,
  });

const phoneAsked = () => screen.findByRole("heading", { name: "What's your phone number?" });
const nameAsked = () => screen.findByRole("heading", { name: "What's your name?" });
// The confirm step shows the booking under the customer's name, on the ticket's stub.
const bookingShown = () => screen.findByText("Kasun Perera");

async function signInWith(phone: string) {
  fireEvent.change(await screen.findByLabelText(/Phone number/), { target: { value: phone } });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
}

function giveName(name: string) {
  fireEvent.change(screen.getByLabelText(/Your name/), { target: { value: name } });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
}

const callsTo = (fetch: ReturnType<typeof mockApi>, method: string, path: string) =>
  fetch.mock.calls
    .map(([request]) => request as Request)
    .filter((request) => request.method === method && new URL(request.url).pathname === path);

afterEach(() => vi.unstubAllGlobals());

describe("POR-03 sign in when booking, and give my name once", () => {
  it("book_asksToSignInFirst_thenReturnsToTheChosenTime", async () => {
    const fetch = api();
    const router = renderPortal(BOOKING);

    expect(await phoneAsked()).toBeInTheDocument();
    await signInWith("077 123 4567");

    expect(await bookingShown()).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/book");
    expect(router.state.location.search).toMatchObject({ resourceId: 2, count: 1 });
    const [request] = callsTo(fetch, "GET", "/v1/customers");
    expect(request!.headers.get("Authorization")).toBe("Bearer fake:+94771234567");
  });

  it("customerKnownFromWhatsApp_isNotAskedForTheirName", async () => {
    const fetch = api();
    renderPortal(BOOKING);

    await signInWith("077 123 4567");

    expect(await bookingShown()).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "What's your name?" })).not.toBeInTheDocument();
    expect(callsTo(fetch, "POST", "/v1/customers")).toHaveLength(0);
  });

  it("firstSignIn_asksForTheNameOnce_andCreatesTheRecord", async () => {
    const fetch = api({
      "GET /v1/customers": inTurn(page([]), page([customer])),
      "POST /v1/customers": customer,
    });
    const router = renderPortal(BOOKING);

    await signInWith("077 123 4567");
    expect(await nameAsked()).toBeInTheDocument();
    expect(screen.getByText("077 123 4567")).toBeInTheDocument();
    giveName("  Kasun Perera ");

    expect(await bookingShown()).toBeInTheDocument();
    const [created] = callsTo(fetch, "POST", "/v1/customers");
    expect(await created!.json()).toEqual({ phone: "+94771234567", name: "Kasun Perera" });

    await router.navigate({ href: BOOKING });
    expect(await bookingShown()).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "What's your name?" })).not.toBeInTheDocument();
    expect(callsTo(fetch, "POST", "/v1/customers")).toHaveLength(1);
  });

  it("name_offersOneAlreadyKnown_andIsRequired", async () => {
    const fetch = api({
      "GET /v1/me": { ...me, name: "Kasun" },
      "GET /v1/customers": page([]),
    });
    renderPortal(BOOKING);

    await signInWith("077 123 4567");
    await nameAsked();
    expect(screen.getByLabelText(/Your name/)).toHaveValue("Kasun");
    giveName("   ");

    expect(await screen.findByText("Enter your name")).toBeInTheDocument();
    expect(callsTo(fetch, "POST", "/v1/customers")).toHaveLength(0);
  });

  it("useAnotherNumber_goesBackToThePhoneStep", async () => {
    api({ "GET /v1/customers": page([]) });
    renderPortal(BOOKING);

    await signInWith("077 123 4567");
    await nameAsked();
    fireEvent.click(screen.getByRole("button", { name: "Use another number" }));

    expect(await phoneAsked()).toBeInTheDocument();
    expect(getAccessToken()).toBeUndefined();
  });

  it("phone_refusesSomethingThatIsNotAPhoneNumber", async () => {
    const fetch = api();
    renderPortal(BOOKING);

    await signInWith("hello");

    expect(await screen.findByText("Enter a phone number like 077 123 4567")).toBeInTheDocument();
    expect(getAccessToken()).toBeUndefined();
    expect(callsTo(fetch, "GET", "/v1/customers")).toHaveLength(0);
  });

  it("refusedSignIn_asksForThePhoneAgain", async () => {
    signInForTesting("+94771234567");
    api({ "GET /v1/customers": failure(401, "tt_htt_401", "Your sign-in has expired") });
    renderPortal(BOOKING);

    expect(await phoneAsked()).toBeInTheDocument();
    await waitFor(() => expect(getAccessToken()).toBeUndefined());
  });

  it("back_onlyLeadsToPagesOfThisPortal", async () => {
    api({ "GET /v1/venues": page([]) });
    const router = renderPortal("/sign-in?back=%2F%2Fevil.example");

    await signInWith("077 123 4567");

    await waitFor(() => expect(router.state.location.pathname).toBe("/"));
  });
});
