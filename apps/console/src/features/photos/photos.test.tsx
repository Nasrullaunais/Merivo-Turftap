import { fireEvent, screen, waitFor } from "@testing-library/react";
import type { StaffRole } from "@turftap/contract";
import { Blob as NodeBlob, File as NodeFile } from "node:buffer";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { signInForTesting } from "../../lib/auth/session";
import { mockApi } from "../../test/mockApi";
import { renderApp } from "../../test/renderApp";
import { myTenant } from "../../test/tenants";
import { fitWithin, shrinkPhoto } from "./shrinkPhoto";

// jsdom's FormData, Blob and File can't go into Node's Request, so uploads here use Node's own.
const NodeFormData = (await new Response(new URLSearchParams()).formData())
  .constructor as typeof FormData;
beforeEach(() => {
  vi.stubGlobal("FormData", NodeFormData);
  vi.stubGlobal("Blob", NodeBlob);
  vi.stubGlobal("File", NodeFile);
});
const file = (text: string, name: string, type: string) =>
  new NodeFile([text], name, { type }) as unknown as File;

// jsdom can't decode or draw images, so shrinking is checked in a real browser instead.
vi.mock("./shrinkPhoto", async (original) => ({
  ...(await original<typeof import("./shrinkPhoto")>()),
  shrinkPhoto: vi.fn<(file: File) => Promise<File>>(),
}));

const PHONE = "+94771234567";
const meAs = (role: StaffRole) => ({
  id: 1,
  phone: PHONE,
  name: "Demo Owner",
  isPlatformAdmin: false,
  tenants: [myTenant({ id: 1, slug: "demo", name: "Demo Sports", role })],
});
const ok = (data: unknown, status = 200) =>
  Response.json({ status, message: "success", data }, { status });
const page = (content: object[]) => ({
  content,
  page: 0,
  size: 100,
  totalElements: content.length,
  totalPages: 1,
});
const times = { createdAt: "2026-11-22T04:00:00.000Z", updatedAt: "2026-11-22T04:00:00.000Z" };
const arena = {
  id: 3,
  name: "City Arena",
  description: null,
  address: "12 Galle Road, Colombo",
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
  ...times,
};
const court = {
  id: 11,
  venueId: 3,
  name: "Court 1",
  type: "FUTSAL_COURT",
  slotMinutes: 60,
  startIntervalMinutes: 30,
  price: { amount: 450_000, currency: "LKR" },
  active: true,
  ...times,
};
const photo = (id: number, position: number, owner: object = { venueId: 3, resourceId: null }) => ({
  id,
  ...owner,
  position,
  url: `https://files.example/3/photos/${id}.jpg?signature=abc`,
  ...times,
});

function venuePageAs(role: StaffRole, photos: object[]) {
  let current = photos;
  const fetch = mockApi({
    "GET /v1/me": meAs(role),
    "GET /v1/venues/3": arena,
    "GET /v1/resources": page([]),
    "GET /v1/closed-dates": page([]),
    "GET /v1/photos": () => ok(page(current)),
    "POST /v1/files": () =>
      ok({ id: 70, purpose: "PHOTO", contentType: "image/jpeg", sizeBytes: 300, ...times }, 201),
    "POST /v1/photos": () => {
      current = [...current, photo(90, current.length + 1)];
      return ok(current.at(-1), 201);
    },
    "PATCH /v1/photos/21": () => {
      current = [photo(22, 1), photo(21, 2)];
      return ok(current[1]);
    },
    "DELETE /v1/photos/21": () => {
      current = [photo(22, 1)];
      return ok(null);
    },
  });
  signInForTesting(PHONE);
  renderApp("/venues/3");
  return fetch;
}

const requestsOf = (fetch: ReturnType<typeof mockApi>, method: string, path: string) =>
  fetch.mock.calls
    .map(([request]) => request as Request)
    .filter((r) => r.method === method && new URL(r.url).pathname === path);

const pickFile = (file: File) =>
  fireEvent.change(screen.getByLabelText("Add a photo (JPG or PNG)"), {
    target: { files: [file] },
  });

describe("VEN-06 venue photos", () => {
  it("frontDesk_seesThePhotosInOrderButCannotChangeThem", async () => {
    const fetch = venuePageAs("FRONT_DESK", [photo(21, 1), photo(22, 2)]);
    const cover = await screen.findByAltText("Cover photo");
    expect(cover).toHaveAttribute("src", photo(21, 1).url);
    expect(screen.getByAltText("Photo 2")).toBeInTheDocument();
    expect(screen.getByText("Cover")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Delete/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Move/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Add a photo (JPG or PNG)")).not.toBeInTheDocument();
    const list = requestsOf(fetch, "GET", "/v1/photos")[0]!;
    expect(new URL(list.url).searchParams.get("venueId")).toBe("3");
  });

  it("manager_addsAShrunkPhotoAfterTheOthers", async () => {
    const picked = file("big phone photo", "IMG_0001.HEIC.jpg", "image/jpeg");
    const shrunk = file("small", "IMG_0001.jpg", "image/jpeg");
    vi.mocked(shrinkPhoto).mockResolvedValueOnce(shrunk);
    const fetch = venuePageAs("MANAGER", [photo(21, 1)]);
    await screen.findByAltText("Cover photo");
    pickFile(picked);
    expect(await screen.findByAltText("Photo 2")).toBeInTheDocument();
    expect(shrinkPhoto).toHaveBeenCalledWith(picked);

    const upload = await requestsOf(fetch, "POST", "/v1/files")[0]!.clone().formData();
    expect(upload.get("purpose")).toBe("PHOTO");
    expect(await (upload.get("file") as File).text()).toBe("small");
    const attach = await requestsOf(fetch, "POST", "/v1/photos")[0]!.clone().json();
    expect(attach).toEqual({ fileId: 70, venueId: 3 });
  });

  it("manager_isToldWhenThePhotoCannotBeOpened", async () => {
    vi.mocked(shrinkPhoto).mockRejectedValueOnce(new DOMException("bad", "InvalidStateError"));
    const fetch = venuePageAs("MANAGER", []);
    await screen.findByText(/^No photos yet/);
    pickFile(file("?", "photo.heic", "image/heic"));
    expect(
      await screen.findByText("This photo couldn't be opened. Pick a JPG or PNG."),
    ).toBeInTheDocument();
    expect(requestsOf(fetch, "POST", "/v1/files")).toHaveLength(0);
  });

  it("manager_movesTheCoverLater", async () => {
    const fetch = venuePageAs("MANAGER", [photo(21, 1), photo(22, 2)]);
    expect(screen.queryByRole("button", { name: "Move Cover photo earlier" })).toBeNull();
    fireEvent.click(await screen.findByRole("button", { name: "Move Cover photo later" }));
    await waitFor(() =>
      expect(screen.getByAltText("Cover photo")).toHaveAttribute("src", photo(22, 1).url),
    );
    expect(await requestsOf(fetch, "PATCH", "/v1/photos/21")[0]!.clone().json()).toEqual({
      position: 2,
    });
  });

  it("manager_deletesAPhoto", async () => {
    const fetch = venuePageAs("MANAGER", [photo(21, 1), photo(22, 2)]);
    fireEvent.click(await screen.findByRole("button", { name: "Delete Cover photo" }));
    await waitFor(() => expect(screen.queryByAltText("Photo 2")).not.toBeInTheDocument());
    expect(screen.getByAltText("Cover photo")).toHaveAttribute("src", photo(22, 1).url);
    expect(requestsOf(fetch, "DELETE", "/v1/photos/21")).toHaveLength(1);
  });
});

describe("VEN-06 resource photos", () => {
  it("resourcePage_listsAndAddsPhotosOfThatResource", async () => {
    vi.mocked(shrinkPhoto).mockImplementationOnce(async (file) => file);
    const fetch = mockApi({
      "GET /v1/me": meAs("MANAGER"),
      "GET /v1/resources/11": court,
      "GET /v1/venues/3": arena,
      "GET /v1/price-rules": page([]),
      "GET /v1/blocked-times": page([]),
      "GET /v1/photos": page([]),
      "POST /v1/files": () =>
        ok({ id: 71, purpose: "PHOTO", contentType: "image/png", sizeBytes: 9, ...times }, 201),
      "POST /v1/photos": () => ok(photo(95, 1, { venueId: null, resourceId: 11 }), 201),
    });
    signInForTesting(PHONE);
    renderApp("/resources/11");
    await screen.findByText(/^No photos yet/);
    const list = requestsOf(fetch, "GET", "/v1/photos")[0]!;
    expect(new URL(list.url).searchParams.get("resourceId")).toBe("11");
    pickFile(file("png", "table.png", "image/png"));
    await waitFor(() => expect(requestsOf(fetch, "POST", "/v1/photos")).toHaveLength(1));
    expect(await requestsOf(fetch, "POST", "/v1/photos")[0]!.clone().json()).toEqual({
      fileId: 71,
      resourceId: 11,
    });
  });
});

describe("VEN-06 photo size", () => {
  it("fitWithin_shrinksTheLongSideTo1600AndKeepsTheShape", () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3024, 4032)).toEqual({ width: 1200, height: 1600 });
  });

  it("fitWithin_neverEnlargesASmallPhoto", () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });
});
