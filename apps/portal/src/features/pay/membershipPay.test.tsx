import { fireEvent, screen } from "@testing-library/react";
import { Blob as NodeBlob, File as NodeFile } from "node:buffer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { signInForTesting } from "../../lib/auth/session";
import { customer, gym, membership, tenant } from "../../test/fixtures";
import { failure, inTurn, mockApi } from "../../test/mockApi";
import { page, renderPortal } from "../../test/renderPortal";

// Two minutes after buying: 18 of the 20 minutes are left.
const NOW = "2026-11-27T20:02:00Z";
const PAY_PAGE = "/memberships/16";

const api = (overrides: Record<string, unknown> = {}) =>
  mockApi({
    "GET /v1/tenant": tenant,
    "GET /v1/memberships/16": membership,
    "GET /v1/venues/3": gym,
    "GET /v1/photos": page([]),
    "POST /v1/files": {
      id: 90,
      purpose: "RECEIPT",
      contentType: "image/png",
      sizeBytes: 2048,
      createdAt: NOW,
    },
    "POST /v1/payments": {
      id: 56,
      bookingId: null,
      membershipId: membership.id,
      venueId: gym.id,
      kind: "TRANSFER",
      status: "PENDING_CHECK",
      amount: membership.amountDue,
      note: null,
      rejectReason: null,
      receiptUrl: null,
      receiptReading: null,
      createdBy: null,
      createdAt: NOW,
      updatedAt: NOW,
    },
    ...overrides,
  });

const requestsTo = (fetch: ReturnType<typeof mockApi>, method: string, path: string) =>
  fetch.mock.calls
    .map(([request]) => request as Request)
    .filter((request) => request.method === method && new URL(request.url).pathname === path);

// jsdom's FormData, Blob and File can't go into Node's Request, so uploads here use Node's own.
const NodeFormData = (await new Response(new URLSearchParams()).formData())
  .constructor as typeof FormData;

beforeEach(() => {
  vi.stubGlobal("FormData", NodeFormData);
  vi.stubGlobal("Blob", NodeBlob);
  vi.stubGlobal("File", NodeFile);
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  signInForTesting(customer.phone);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("MEM-02 pay for a membership", () => {
  it("waitingForPayment_asksForTheFullPriceByTransfer", async () => {
    api();
    renderPortal(PAY_PAGE);

    expect(
      await screen.findByRole("heading", { name: "Send LKR\u00a02,500 to confirm" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("timer")).toHaveAccessibleName("18:00 left to pay");
    expect(screen.getByRole("button", { name: "Copy account number" })).toHaveTextContent(
      "8001 2345 6789",
    );
    expect(screen.getByText("Tue 1 Dec to Thu 10 Dec")).toBeInTheDocument();
    expect(screen.queryByText(/paid at the venue/)).not.toBeInTheDocument();
  });

  it("receipt_isSentForTheMembership_andItWaitsForACheck", async () => {
    const fetch = api({
      "GET /v1/memberships/16": inTurn(membership, { ...membership, status: "AWAITING_CHECK" }),
    });
    renderPortal(PAY_PAGE);

    fireEvent.change(await screen.findByLabelText(/Choose your receipt/), {
      target: {
        files: [new NodeFile([new Uint8Array(2048)], "transfer.png", { type: "image/png" })],
      },
    });
    fireEvent.click(await screen.findByRole("button", { name: "Send receipt" }));

    expect(await screen.findByRole("heading", { name: "Receipt sent" })).toBeInTheDocument();
    const [sent] = requestsTo(fetch, "POST", "/v1/payments");
    expect(await sent!.json()).toEqual({ kind: "TRANSFER", membershipId: 16, fileId: 90 });
  });

  it("active_showsTheDaysItCovers", async () => {
    api({
      "GET /v1/memberships/16": {
        ...membership,
        status: "ACTIVE",
        expiresAt: null,
        bankAccount: null,
      },
    });
    renderPortal(PAY_PAGE);

    expect(
      await screen.findByRole("heading", { name: "Your membership is active" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Use the gym from Tue 1 Dec to Thu 10 Dec.")).toBeInTheDocument();
  });

  it("timeRanOut_offersToBuyAgain", async () => {
    api({ "GET /v1/memberships/16": { ...membership, expiresAt: "2026-11-27T20:01:00.000Z" } });
    renderPortal(PAY_PAGE);

    expect(
      await screen.findByRole("heading", { name: "The time to pay ran out" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Buy again" })).toHaveAttribute(
      "href",
      expect.stringContaining("/plans/8"),
    );
  });

  it("someoneElsesMembership_isNotFound", async () => {
    api({ "GET /v1/memberships/16": failure(404, "tt_mem_003", "Membership 16 was not found") });
    renderPortal(PAY_PAGE);

    expect(
      await screen.findByRole("heading", { name: "Membership not found" }),
    ).toBeInTheDocument();
  });
});
