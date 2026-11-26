import { fireEvent, screen, waitFor } from "@testing-library/react";
import { Blob as NodeBlob, File as NodeFile } from "node:buffer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { signInForTesting } from "../../lib/auth/session";
import { booking, court, customer, tenant, venue } from "../../test/fixtures";
import { failure, inTurn, mockApi } from "../../test/mockApi";
import { page, renderPortal } from "../../test/renderPortal";

// Two minutes after booking: 18 of the 20 minutes are left.
const NOW = "2026-11-27T20:02:00Z";
const BYTES_PER_MB = 1024 * 1024;
const PAY_PAGE = "/bookings/41";

const uploaded = {
  id: 90,
  purpose: "RECEIPT",
  contentType: "image/png",
  sizeBytes: 2048,
  createdAt: NOW,
};
const payment = {
  id: 55,
  bookingId: 41,
  membershipId: null,
  venueId: venue.id,
  kind: "TRANSFER",
  status: "PENDING_CHECK",
  amount: booking.amountDue,
  note: null,
  rejectReason: null,
  receiptUrl: null,
  receiptReading: null,
  createdBy: null,
  createdAt: NOW,
  updatedAt: NOW,
};

const api = (overrides: Record<string, unknown> = {}) =>
  mockApi({
    "GET /v1/tenant": tenant,
    "GET /v1/bookings/41": booking,
    "GET /v1/resources/2": court,
    "GET /v1/venues/1": venue,
    "GET /v1/photos": page([]),
    "GET /v1/price-rules": page([]),
    "GET /v1/closed-dates": page([]),
    "GET /v1/availability": page([]),
    "POST /v1/files": uploaded,
    "POST /v1/payments": payment,
    ...overrides,
  });

const requestsTo = (fetch: ReturnType<typeof mockApi>, method: string, path: string) =>
  fetch.mock.calls
    .map(([request]) => request as Request)
    .filter((request) => request.method === method && new URL(request.url).pathname === path);

const pickReceipt = async (file: File) =>
  fireEvent.change(await screen.findByLabelText(/Choose your receipt/), {
    target: { files: [file] },
  });
// jsdom's FormData, Blob and File can't go into Node's Request, so uploads here use Node's own.
const NodeFormData = (await new Response(new URLSearchParams()).formData())
  .constructor as typeof FormData;
const fileOf = (name: string, type: string, bytes: number) =>
  new NodeFile([new Uint8Array(bytes)], name, { type }) as unknown as File;

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

describe("PAY-01 see how to pay", () => {
  it("payPage_showsTheBankDetailsTheAmountAndTheTimeLeft", async () => {
    api();
    renderPortal(PAY_PAGE);

    expect(
      await screen.findByRole("heading", { name: "Send LKR 4,500 to confirm" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("timer")).toHaveAccessibleName("18:00 left to pay");
    expect(screen.getByRole("button", { name: "Copy account number" })).toHaveTextContent(
      "8001 2345 6789",
    );
    expect(screen.getByRole("button", { name: "Copy bank" })).toHaveTextContent("Commercial Bank");
    expect(screen.getByRole("button", { name: "Copy branch" })).toHaveTextContent("Kollupitiya");
    expect(screen.getByRole("button", { name: "Copy account name" })).toHaveTextContent(
      "Kick Off Sports (Pvt) Ltd",
    );
    expect(screen.getByText("The other LKR 4,500 is paid at the venue.")).toBeInTheDocument();
  });

  it("aLongTimeLimit_showsHoursAndMinutesLeft", async () => {
    const dayLater = new Date(Date.parse(NOW) + 23.5 * 60 * 60_000).toISOString();
    api({ "GET /v1/bookings/41": { ...booking, expiresAt: dayLater } });
    renderPortal(PAY_PAGE);

    expect(await screen.findByRole("timer")).toHaveAccessibleName("23h 30m left to pay");
  });

  it("copy_putsTheAccountNumberOnTheClipboardAsDigitsOnly", async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>(async () => {});
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    api();
    renderPortal(PAY_PAGE);

    fireEvent.click(await screen.findByRole("button", { name: "Copy account number" }));

    expect(await screen.findByText("Copied")).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith("800123456789");
  });

  it("timeRanOut_showsItExpired_andOffersToBookAgain", async () => {
    api({ "GET /v1/bookings/41": { ...booking, expiresAt: "2026-11-27T20:01:00.000Z" } });
    renderPortal(PAY_PAGE);

    expect(
      await screen.findByRole("heading", { name: "The time to pay ran out" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Book again" })).toHaveAttribute(
      "href",
      expect.stringContaining("/resources/2"),
    );
    expect(screen.queryByLabelText(/Choose your receipt/)).not.toBeInTheDocument();
  });

  it("someoneElsesBooking_isNotFound", async () => {
    api({ "GET /v1/bookings/41": failure(404, "tt_bkg_001", "Booking 41 was not found") });
    renderPortal(PAY_PAGE);

    expect(await screen.findByRole("heading", { name: "Booking not found" })).toBeInTheDocument();
  });
});

describe("PAY-02 send a Transfer Receipt", () => {
  it("tooLargeFile_isRefusedBeforeUpload", async () => {
    const fetch = api();
    renderPortal(PAY_PAGE);

    await pickReceipt(fileOf("receipt.png", "image/png", 6 * BYTES_PER_MB));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That file is 6.0 MB. Choose one of 5 MB or less.",
    );
    expect(screen.queryByRole("button", { name: "Send receipt" })).not.toBeInTheDocument();
    expect(requestsTo(fetch, "POST", "/v1/files")).toHaveLength(0);
  });

  it("wrongKindOfFile_isRefusedBeforeUpload", async () => {
    const fetch = api();
    renderPortal(PAY_PAGE);

    await pickReceipt(fileOf("receipt.heic", "image/heic", 2048));

    expect(await screen.findByRole("alert")).toHaveTextContent("That file isn't a JPG, PNG or PDF");
    expect(requestsTo(fetch, "POST", "/v1/files")).toHaveLength(0);
  });

  it("receipt_isUploadedThenSent_andTheBookingWaitsForACheck", async () => {
    const fetch = api({
      "GET /v1/bookings/41": inTurn(booking, { ...booking, status: "AWAITING_CHECK" }),
    });
    renderPortal(PAY_PAGE);

    await pickReceipt(fileOf("transfer.png", "image/png", 2048));
    expect(await screen.findByText("transfer.png")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Send receipt" }));

    expect(await screen.findByRole("heading", { name: "Receipt sent" })).toBeInTheDocument();
    const [upload] = requestsTo(fetch, "POST", "/v1/files");
    const form = await upload!.formData();
    expect(form.get("purpose")).toBe("RECEIPT");
    expect((form.get("file") as File).name).toBe("transfer.png");
    const [sent] = requestsTo(fetch, "POST", "/v1/payments");
    expect(await sent!.json()).toEqual({ kind: "TRANSFER", bookingId: 41, fileId: 90 });
  });

  it("receiptAfterTheTimeLimit_showsTheBookingExpired", async () => {
    api({
      "GET /v1/bookings/41": inTurn(booking, { ...booking, status: "EXPIRED", expiresAt: null }),
      "POST /v1/payments": failure(409, "tt_pay_009", "The time to pay has passed"),
    });
    renderPortal(PAY_PAGE);

    await pickReceipt(fileOf("transfer.pdf", "application/pdf", 2048));
    fireEvent.click(await screen.findByRole("button", { name: "Send receipt" }));

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "The time to pay ran out" })).toBeInTheDocument(),
    );
  });
});
