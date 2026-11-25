import { fireEvent, screen, waitFor } from "@testing-library/react";
import type { StaffRole } from "@turftap/contract";
import { describe, expect, it } from "vitest";

import { signInForTesting } from "../../lib/auth/session";
import { mockApi } from "../../test/mockApi";
import { renderApp } from "../../test/renderApp";
import { myTenant } from "../../test/tenants";

const PHONE = "+94771234567";
const meAs = (role: StaffRole) => ({
  id: 1,
  phone: PHONE,
  name: "Demo Owner",
  isPlatformAdmin: false,
  tenants: [myTenant({ id: 1, slug: "demo", name: "Demo Sports", role })],
});
const ok = (data: unknown) => Response.json({ status: 200, message: "success", data });
const page = (content: object[]) => ({
  content,
  page: 0,
  size: 100,
  totalElements: content.length,
  totalPages: 1,
});
const arena = {
  id: 3,
  name: "City Arena",
  description: null,
  address: "12 Galle Road, Colombo",
  phone: "+94112345678",
  timeZone: "Asia/Colombo",
  bankAccount: null,
  advancePercent: 100,
  paymentTimeLimitMinutes: 20,
  cancellationCutOffHours: 6,
  payAtVenue: false,
  seriesPaymentDaysBefore: 2,
  hasGym: false,
  openingHours: [],
  active: true,
  createdAt: "2026-11-22T04:00:00.000Z",
  updatedAt: "2026-11-22T04:00:00.000Z",
};
const bankAccount = {
  bankName: "Bank of Ceylon",
  branch: "Kollupitiya",
  accountName: "City Arena (Pvt) Ltd",
  accountNumber: "0071 2345 678",
};

function venuePageAs(role: StaffRole, venue: object = arena) {
  let current = venue;
  const fetch = mockApi({
    "GET /v1/me": meAs(role),
    "GET /v1/venues/3": () => ok(current),
    "GET /v1/resources": page([]),
    "GET /v1/closed-dates": page([]),
    "PATCH /v1/venues/3": async (request: Request) => {
      current = { ...current, ...(await request.clone().json()) };
      return ok(current);
    },
  });
  signInForTesting(PHONE);
  renderApp("/venues/3");
  return fetch;
}

const patchesOf = (fetch: ReturnType<typeof mockApi>) =>
  Promise.all(
    fetch.mock.calls
      .map(([request]) => request as Request)
      .filter((request) => request.method === "PATCH")
      .map((request) => request.clone().json()),
  );

const type = (label: RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

async function fillBankAccount() {
  type(/^Bank/, bankAccount.bankName);
  type(/^Branch/, bankAccount.branch);
  type(/^Account name/, bankAccount.accountName);
  type(/^Account number/, bankAccount.accountNumber);
}

describe("VEN-03 venue payment settings", () => {
  it("owner_setsTheBankAccountAndAnAdvance", async () => {
    const fetch = venuePageAs("OWNER");
    await screen.findByRole("button", { name: "Save payment settings" });
    await fillBankAccount();
    fireEvent.click(screen.getByRole("radio", { name: "An Advance" }));
    type(/^Advance \(%\)/, "30");
    type(/^Payment Time Limit/, "45");
    type(/^Cancellation Cut-off/, "12");
    type(/^Repeat Series payment/, "3");
    fireEvent.click(screen.getByRole("button", { name: "Save payment settings" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Payment settings saved. They apply to new bookings.",
    );
    expect(await patchesOf(fetch)).toEqual([
      {
        payAtVenue: false,
        bankAccount,
        advancePercent: 30,
        paymentTimeLimitMinutes: 45,
        cancellationCutOffHours: 12,
        seriesPaymentDaysBefore: 3,
      },
    ]);
  });

  it("owner_turnsOnPayAtVenueWithoutBankDetailsOrAnAdvance", async () => {
    const fetch = venuePageAs("OWNER");
    fireEvent.click(await screen.findByRole("switch", { name: "Pay at Venue" }));
    expect(
      screen.getByText(
        "Customers pay everything at the venue. Online bookings are confirmed straight away.",
      ),
    ).toBeInTheDocument();
    for (const hidden of [/^Bank/, /^Account number/, /^Payment Time Limit/, /^Repeat Series/])
      expect(screen.queryByLabelText(hidden)).not.toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "An Advance" })).not.toBeInTheDocument();
    type(/^Cancellation Cut-off/, "12");
    fireEvent.click(screen.getByRole("button", { name: "Save payment settings" }));
    await waitFor(async () =>
      expect(await patchesOf(fetch)).toEqual([{ payAtVenue: true, cancellationCutOffHours: 12 }]),
    );
  });

  it("owner_turningPayAtVenueOffShowsTheSavedBankDetailsAgain", async () => {
    venuePageAs("OWNER", { ...arena, bankAccount, payAtVenue: true });
    const payAtVenue = await screen.findByRole("switch", { name: "Pay at Venue" });
    expect(payAtVenue).toBeChecked();
    expect(screen.queryByLabelText(/^Account number/)).not.toBeInTheDocument();
    fireEvent.click(payAtVenue);
    expect(screen.getByLabelText(/^Account number/)).toHaveValue(bankAccount.accountNumber);
  });

  it.each(["0", "8"])("owner_isToldSeriesPaymentDaysMustBeOneToSeven %s", async (days) => {
    const fetch = venuePageAs("OWNER", { ...arena, bankAccount });
    await screen.findByRole("button", { name: "Save payment settings" });
    type(/^Repeat Series payment/, days);
    fireEvent.click(screen.getByRole("button", { name: "Save payment settings" }));
    expect(await screen.findByText("Enter a whole number from 1 to 7")).toBeInTheDocument();
    expect(await patchesOf(fetch)).toEqual([]);
  });

  it("owner_choosingTheFullAmountSendsOneHundredPercent", async () => {
    const fetch = venuePageAs("OWNER", { ...arena, bankAccount, advancePercent: 30 });
    expect(await screen.findByLabelText(/^Advance \(%\)/)).toHaveValue(30);
    fireEvent.click(screen.getByRole("radio", { name: "The full amount" }));
    type(/^Branch/, "");
    fireEvent.click(screen.getByRole("button", { name: "Save payment settings" }));
    await waitFor(async () =>
      expect(await patchesOf(fetch)).toEqual([
        expect.objectContaining({
          bankAccount: { ...bankAccount, branch: null },
          advancePercent: 100,
        }),
      ]),
    );
  });

  it("owner_isToldWhenTheAdvanceIsNotBelowOneHundred", async () => {
    const fetch = venuePageAs("OWNER", { ...arena, bankAccount });
    fireEvent.click(await screen.findByRole("radio", { name: "An Advance" }));
    type(/^Advance \(%\)/, "100");
    fireEvent.click(screen.getByRole("button", { name: "Save payment settings" }));
    expect(await screen.findByText("Enter a whole number from 1 to 99")).toBeInTheDocument();
    expect(await patchesOf(fetch)).toEqual([]);
  });

  it("owner_isToldWhenTheAccountNumberHasLetters", async () => {
    const fetch = venuePageAs("OWNER");
    await screen.findByRole("button", { name: "Save payment settings" });
    await fillBankAccount();
    type(/^Account number/, "ABC-123");
    fireEvent.click(screen.getByRole("button", { name: "Save payment settings" }));
    expect(
      await screen.findByText("Use digits, with spaces or dashes if you like"),
    ).toBeInTheDocument();
    expect(await patchesOf(fetch)).toEqual([]);
  });

  it("frontDesk_seesTheSettingsToTellCustomersButCannotChangeThem", async () => {
    venuePageAs("FRONT_DESK", { ...arena, bankAccount, advancePercent: 30 });
    expect(
      await screen.findByText(
        "Bank of Ceylon · Kollupitiya · City Arena (Pvt) Ltd · 0071 2345 678",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Customers pay a 30% Advance when they book online."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("They have 20 minutes to send a Transfer Receipt."),
    ).toBeInTheDocument();
    expect(screen.getByText("They can cancel up to 6 hours before the start.")).toBeInTheDocument();
    expect(
      screen.getByText("The Advance for each Repeat Series booking is asked for 2 days before it."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save payment settings" })).not.toBeInTheDocument();
  });

  it("frontDesk_atAPayAtVenueVenueSeesNoBankDetails", async () => {
    venuePageAs("FRONT_DESK", { ...arena, bankAccount, payAtVenue: true });
    expect(
      await screen.findByText(
        "Customers pay everything at the venue. Online bookings are confirmed straight away.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("They can cancel up to 6 hours before the start.")).toBeInTheDocument();
    expect(screen.queryByText(/Bank of Ceylon/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Transfer Receipt/)).not.toBeInTheDocument();
  });

  it("manager_seesWhenThereIsNoBankAccountYet", async () => {
    venuePageAs("MANAGER");
    expect(
      await screen.findByText("No bank account yet. The Owner adds it here."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Customers pay the full amount when they book online."),
    ).toBeInTheDocument();
  });
});
