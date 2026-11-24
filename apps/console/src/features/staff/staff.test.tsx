import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import type { StaffRole } from "@turftap/contract";
import { describe, expect, it } from "vitest";

import { signInForTesting } from "../../lib/auth/session";
import { apiError, mockApi } from "../../test/mockApi";
import { renderApp } from "../../test/renderApp";
import { myTenant } from "../../test/tenants";

const OWNER_PHONE = "+94771234567";
const added = {
  id: 9,
  phone: "+94770001111",
  name: null,
  role: "MANAGER",
  allVenues: true,
  venueIds: [] as number[],
  createdAt: "2026-11-22T04:00:00.000Z",
  updatedAt: "2026-11-22T04:00:00.000Z",
};
const owner = { ...added, id: 1, phone: OWNER_PHONE, name: "Demo Owner", role: "OWNER" };
const page = (content: object[]) => ({
  content,
  page: 0,
  size: 100,
  totalElements: content.length,
  totalPages: 1,
});
const meAs = (role: StaffRole) => ({
  id: 1,
  phone: OWNER_PHONE,
  name: "Demo Owner",
  isPlatformAdmin: false,
  tenants: [myTenant({ id: 1, slug: "demo", name: "Demo Sports", role })],
});
const created = (body: object) =>
  Response.json({ status: 201, message: "success", data: body }, { status: 201 });

const openAddForm = async () =>
  fireEvent.click(await screen.findByRole("button", { name: "Add staff" }));

function addStaff(phone: string, role: string) {
  fireEvent.change(screen.getByLabelText(/Phone number/), { target: { value: phone } });
  fireEvent.click(screen.getByRole("radio", { name: role }));
  fireEvent.click(screen.getByRole("button", { name: "Add" }));
}

describe("SIG-03 invite staff from the Staff Console", () => {
  it("owner_addsSomeoneByPhoneWithARole", async () => {
    signInForTesting(OWNER_PHONE);
    const sent: unknown[] = [];
    let staff: object[] = [owner];
    mockApi({
      "GET /v1/me": meAs("OWNER"),
      "GET /v1/staff": () => Response.json({ status: 200, message: "success", data: page(staff) }),
      "POST /v1/staff": async (request: Request) => {
        sent.push(await request.json());
        staff = [owner, added];
        return created(added);
      },
    });
    renderApp("/staff");
    expect(await screen.findByText("Demo Owner")).toBeInTheDocument();
    await openAddForm();
    addStaff("077 000 1111", "Manager");
    expect(await screen.findByRole("status")).toHaveTextContent(
      "+94770001111 was added. They'll get a WhatsApp message with the console link.",
    );
    expect(sent).toEqual([
      { phone: "077 000 1111", role: "MANAGER", allVenues: true, venueIds: [] },
    ]);
    expect(await screen.findByText("Hasn't signed in yet")).toBeInTheDocument();
  });

  it("owner_isToldWhenTheyAreAlreadyStaff", async () => {
    signInForTesting(OWNER_PHONE);
    mockApi({
      "GET /v1/me": meAs("OWNER"),
      "GET /v1/staff": page([owner]),
      "POST /v1/staff": () => apiError(409, "tt_stf_002", "This person is already staff here"),
    });
    renderApp("/staff");
    await screen.findByText("Demo Owner");
    await openAddForm();
    addStaff(OWNER_PHONE, "Owner");
    expect(await screen.findByText("This person is already staff here")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("addStaff_refusesSomethingThatIsNotAPhoneNumber", async () => {
    signInForTesting(OWNER_PHONE);
    const fetch = mockApi({ "GET /v1/me": meAs("OWNER"), "GET /v1/staff": page([owner]) });
    renderApp("/staff");
    await screen.findByText("Demo Owner");
    await openAddForm();
    addStaff("hello", "Manager");
    expect(await screen.findByText("Enter a phone number like 077 123 4567")).toBeInTheDocument();
    const methods = fetch.mock.calls.map(([request]) => (request as Request).method);
    expect(methods).not.toContain("POST");
  });

  it("manager_seesTheStaffButCannotChangeThem", async () => {
    signInForTesting(OWNER_PHONE);
    mockApi({ "GET /v1/me": meAs("MANAGER"), "GET /v1/staff": page([owner]) });
    renderApp("/staff");
    expect(await screen.findByText("Demo Owner")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Add staff" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Remove/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Role for/ })).not.toBeInTheDocument();
  });
});

describe("SIG-04 change or remove staff from the Staff Console", () => {
  const noContent = () => Response.json({ status: 200, message: "success", data: null });

  it("owner_changesSomeonesRole", async () => {
    signInForTesting(OWNER_PHONE);
    const sent: unknown[] = [];
    let person = added;
    mockApi({
      "GET /v1/me": meAs("OWNER"),
      "GET /v1/staff": () =>
        Response.json({ status: 200, message: "success", data: page([owner, person]) }),
      "PATCH /v1/staff/9": async (request: Request) => {
        sent.push(await request.json());
        person = { ...added, role: "FRONT_DESK" };
        return Response.json({ status: 200, message: "success", data: person });
      },
    });
    renderApp("/staff");
    fireEvent.click(await screen.findByRole("button", { name: /Role for \+94770001111/ }));
    fireEvent.click(await screen.findByRole("option", { name: "Front Desk" }));
    await waitFor(() => expect(sent).toEqual([{ role: "FRONT_DESK" }]));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Role for \+94770001111/ })).toHaveTextContent(
        "Front Desk",
      ),
    );
  });

  it("owner_removesSomeoneOnlyAfterConfirming", async () => {
    signInForTesting(OWNER_PHONE);
    let staff: object[] = [owner, added];
    const fetch = mockApi({
      "GET /v1/me": meAs("OWNER"),
      "GET /v1/staff": () => Response.json({ status: 200, message: "success", data: page(staff) }),
      "DELETE /v1/staff/9": () => {
        staff = [owner];
        return noContent();
      },
    });
    const deletes = () =>
      fetch.mock.calls.filter(([request]) => (request as Request).method === "DELETE");
    renderApp("/staff");

    fireEvent.click(await screen.findByRole("button", { name: "Remove +94770001111" }));
    fireEvent.click(await screen.findByRole("button", { name: "Keep them" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Keep them" })).toBeNull());
    expect(deletes()).toHaveLength(0);
    expect(screen.getByText("+94770001111")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove +94770001111" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Remove +94770001111?" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(screen.queryByText("+94770001111")).not.toBeInTheDocument());
    expect(deletes()).toHaveLength(1);
  });

  it("owner_isToldTheyAreTheLastOwner", async () => {
    signInForTesting(OWNER_PHONE);
    mockApi({
      "GET /v1/me": meAs("OWNER"),
      "GET /v1/staff": page([owner]),
      "PATCH /v1/staff/1": () =>
        apiError(
          409,
          "tt_stf_003",
          "A tenant needs at least one Owner. Make someone else an Owner first.",
        ),
    });
    renderApp("/staff");
    fireEvent.click(await screen.findByRole("button", { name: /Role for Demo Owner/ }));
    fireEvent.click(await screen.findByRole("option", { name: "Manager" }));
    expect(
      await screen.findByText(
        "A tenant needs at least one Owner. Make someone else an Owner first.",
      ),
    ).toBeInTheDocument();
  });

  it("owner_whoRemovesThemselvesLosesAccessToTheTenant", async () => {
    signInForTesting(OWNER_PHONE);
    let me = meAs("OWNER");
    mockApi({
      "GET /v1/me": () => Response.json({ status: 200, message: "success", data: me }),
      "GET /v1/staff": page([owner, { ...added, role: "OWNER" }]),
      "DELETE /v1/staff/1": () => {
        me = { ...me, tenants: [] };
        return noContent();
      },
    });
    renderApp("/staff");
    fireEvent.click(await screen.findByRole("button", { name: "Remove Demo Owner" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Remove Demo Owner?" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Remove" }));
    expect(await screen.findByText("You don't have access to any venue yet")).toBeInTheDocument();
  });
});

describe("SIG-05 what each role can see in the Staff Console", () => {
  const staffLink = () =>
    within(screen.getByRole("navigation", { name: "Main" })).queryByRole("link", { name: "Staff" });

  it.each(["OWNER", "MANAGER"] as const)("%s_seesTheStaffLink", async (role) => {
    signInForTesting(OWNER_PHONE);
    mockApi({ "GET /v1/me": meAs(role), "GET /v1/staff": page([owner]) });
    renderApp("/");
    await screen.findByRole("navigation", { name: "Main" });
    expect(staffLink()).toBeInTheDocument();
  });

  it("frontDesk_seesNoStaffLinkAndCannotOpenTheStaffPage", async () => {
    signInForTesting(OWNER_PHONE);
    const fetch = mockApi({ "GET /v1/me": meAs("FRONT_DESK"), "GET /v1/staff": page([owner]) });
    const { router } = renderApp("/staff");
    await screen.findByRole("navigation", { name: "Main" });
    await waitFor(() => expect(router.state.location.pathname).toBe("/"));
    expect(staffLink()).not.toBeInTheDocument();
    expect(screen.queryByText("Demo Owner")).not.toBeInTheDocument();
    const paths = fetch.mock.calls.map(([request]) => new URL((request as Request).url).pathname);
    expect(paths).not.toContain("/v1/staff");
  });
});

describe("SIG-06 choose which venues staff work at", () => {
  const venue = (id: number, name: string) => ({
    id,
    name,
    description: null,
    address: "12 Galle Road, Colombo 03",
    phone: "+94112345678",
    timeZone: "Asia/Colombo",
    bankAccount: null,
    advancePercent: 100,
    paymentTimeLimitMinutes: 30,
    cancellationCutOffHours: 6,
    payAtVenue: false,
    seriesPaymentDaysBefore: 2,
    openingHours: [],
    active: true,
    createdAt: "2026-11-22T04:00:00.000Z",
    updatedAt: "2026-11-22T04:00:00.000Z",
  });
  const venues = page([venue(2, "Colombo Arena"), venue(3, "Kandy Arena")]);
  const limited = { ...added, allVenues: false, venueIds: [3] };

  it("owner_limitsANewManagerToOneVenue", async () => {
    signInForTesting(OWNER_PHONE);
    const sent: unknown[] = [];
    mockApi({
      "GET /v1/me": meAs("OWNER"),
      "GET /v1/staff": page([owner]),
      "GET /v1/venues": venues,
      "POST /v1/staff": async (request: Request) => {
        sent.push(await request.json());
        return created(limited);
      },
    });
    renderApp("/staff");
    await screen.findByText("Demo Owner");
    await openAddForm();
    fireEvent.click(screen.getByRole("checkbox", { name: "All venues" }));
    fireEvent.click(await screen.findByRole("checkbox", { name: "Kandy Arena" }));
    addStaff("077 000 1111", "Manager");
    await waitFor(() =>
      expect(sent).toEqual([
        { phone: "077 000 1111", role: "MANAGER", allVenues: false, venueIds: [3] },
      ]),
    );
  });

  it("owner_isToldToPickAVenue", async () => {
    signInForTesting(OWNER_PHONE);
    const fetch = mockApi({
      "GET /v1/me": meAs("OWNER"),
      "GET /v1/staff": page([owner]),
      "GET /v1/venues": venues,
    });
    renderApp("/staff");
    await screen.findByText("Demo Owner");
    await openAddForm();
    fireEvent.click(screen.getByRole("checkbox", { name: "All venues" }));
    addStaff("077 000 1111", "Manager");
    expect(await screen.findByText("Pick at least one venue")).toBeInTheDocument();
    const methods = fetch.mock.calls.map(([request]) => (request as Request).method);
    expect(methods).not.toContain("POST");
  });

  it("owner_addingAnOwnerHasNoVenueChoice", async () => {
    signInForTesting(OWNER_PHONE);
    mockApi({ "GET /v1/me": meAs("OWNER"), "GET /v1/staff": page([]), "GET /v1/venues": venues });
    renderApp("/staff");
    await openAddForm();
    fireEvent.click(screen.getByRole("radio", { name: "Owner" }));
    expect(screen.queryByRole("checkbox", { name: "All venues" })).not.toBeInTheDocument();
  });

  it("list_showsWhereEachPersonWorks", async () => {
    signInForTesting(OWNER_PHONE);
    mockApi({
      "GET /v1/me": meAs("MANAGER"),
      "GET /v1/staff": page([owner, limited]),
      "GET /v1/venues": venues,
    });
    renderApp("/staff");
    expect(await screen.findByText("Kandy Arena")).toBeInTheDocument();
    expect(screen.getByText("All venues")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Change venues/ })).not.toBeInTheDocument();
  });

  it("owner_changesSomeonesVenues", async () => {
    signInForTesting(OWNER_PHONE);
    const sent: unknown[] = [];
    let person: object = added;
    mockApi({
      "GET /v1/me": meAs("OWNER"),
      "GET /v1/staff": () =>
        Response.json({ status: 200, message: "success", data: page([owner, person]) }),
      "GET /v1/venues": venues,
      "PATCH /v1/staff/9": async (request: Request) => {
        sent.push(await request.json());
        person = limited;
        return Response.json({ status: 200, message: "success", data: person });
      },
    });
    renderApp("/staff");
    const change = await screen.findByRole("button", { name: "Change venues for +94770001111" });
    expect(screen.queryByRole("button", { name: "Change venues for Demo Owner" })).toBeNull();
    fireEvent.click(change);
    const picker = await screen.findByRole("dialog", { name: "Change venues for +94770001111" });
    fireEvent.click(within(picker).getByRole("checkbox", { name: "All venues" }));
    fireEvent.click(await within(picker).findByRole("checkbox", { name: "Kandy Arena" }));
    fireEvent.click(within(picker).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(sent).toEqual([{ allVenues: false, venueIds: [3] }]));
    const card = screen.getByText("+94770001111").closest("li")!;
    expect(await within(card).findByText("Kandy Arena")).toBeInTheDocument();
  });
});
