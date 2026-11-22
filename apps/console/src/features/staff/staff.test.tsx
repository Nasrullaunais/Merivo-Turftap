import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { signInForTesting } from "../../lib/auth/session";
import { apiError, mockApi } from "../../test/mockApi";
import { renderApp } from "../../test/renderApp";

const OWNER_PHONE = "+94771234567";
const added = {
  id: 9,
  phone: "+94770001111",
  name: null,
  role: "MANAGER",
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
const meAs = (role: string) => ({
  id: 1,
  phone: OWNER_PHONE,
  name: "Demo Owner",
  isPlatformAdmin: false,
  tenants: [{ id: 1, slug: "demo", name: "Demo Sports", role }],
});
const created = (body: object) =>
  Response.json({ status: 201, message: "success", data: body }, { status: 201 });

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
    addStaff("077 000 1111", "Manager");
    expect(await screen.findByRole("status")).toHaveTextContent(
      "+94770001111 was added. They'll get a WhatsApp message with the console link.",
    );
    expect(sent).toEqual([{ phone: "077 000 1111", role: "MANAGER" }]);
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
    addStaff(OWNER_PHONE, "Owner");
    expect(await screen.findByText("This person is already staff here")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("addStaff_refusesSomethingThatIsNotAPhoneNumber", async () => {
    signInForTesting(OWNER_PHONE);
    const fetch = mockApi({ "GET /v1/me": meAs("OWNER"), "GET /v1/staff": page([owner]) });
    renderApp("/staff");
    await screen.findByText("Demo Owner");
    addStaff("hello", "Manager");
    expect(await screen.findByText("Enter a phone number like 077 123 4567")).toBeInTheDocument();
    const methods = fetch.mock.calls.map(([request]) => (request as Request).method);
    expect(methods).not.toContain("POST");
  });

  it.each(["MANAGER", "FRONT_DESK"])("%s_seesTheStaffButCannotAddAnyone", async (role) => {
    signInForTesting(OWNER_PHONE);
    mockApi({ "GET /v1/me": meAs(role), "GET /v1/staff": page([owner]) });
    renderApp("/staff");
    expect(await screen.findByText("Demo Owner")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Add staff" })).not.toBeInTheDocument();
  });
});
