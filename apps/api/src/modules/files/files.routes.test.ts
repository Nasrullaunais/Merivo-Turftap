import { beforeAll, describe, expect, it } from "bun:test";

import { MAX_UPLOAD_BYTES } from "@turftap/contract";
import { eq } from "drizzle-orm";

import { db } from "../../lib/db";
import { ports } from "../../ports";
import {
  asStaff,
  call,
  createTenant,
  imageBytes,
  type TestTenant,
  uploadForm,
} from "../../test/fixtures";
import { files } from "./files.tables";

const storedRow = async (id: number) =>
  (await db().select().from(files).where(eq(files.id, id)))[0]!;

describe("VEN-06 upload a photo file", () => {
  let tenant: TestTenant;
  beforeAll(async () => {
    tenant = await createTenant();
  });

  const upload = (form: FormData, as = asStaff(tenant)) => call("POST", "/v1/files", as, form);

  it("create_storesAJpgInTheTenantsPhotoFolder", async () => {
    const bytes = imageBytes("jpg");
    const reply = await upload(uploadForm(bytes));
    expect(reply.status).toBe(201);
    expect(reply.body.data).toEqual({
      id: expect.any(Number),
      purpose: "PHOTO",
      contentType: "image/jpeg",
      sizeBytes: bytes.byteLength,
      createdAt: expect.any(String),
    });
    const { key } = await storedRow(reply.body.data.id);
    expect(key).toMatch(new RegExp(`^${tenant.id}/photos/[0-9a-f-]{36}\\.jpg$`));
    const stored = await ports().storage.read(key);
    expect(stored).toEqual({ body: bytes, contentType: "image/jpeg" });
  });

  it("create_judgesTheTypeByTheBytesNotTheLabel", async () => {
    const png = await upload(uploadForm(imageBytes("png"), "PHOTO", "application/octet-stream"));
    expect(png.body.data.contentType).toBe("image/png");
    expect((await storedRow(png.body.data.id)).key).toEndWith(".png");

    const text = new TextEncoder().encode("<html>not a photo</html>");
    const reply = await upload(uploadForm(text, "PHOTO", "image/jpeg"));
    expect(reply).toMatchObject({ status: 400, body: { code: "tt_htt_400" } });
    expect(reply.body.errors).toEqual([{ field: "file", message: "Must be a JPG or PNG" }]);
  });

  it("create_refusesAFileOverFiveMb", async () => {
    const reply = await upload(uploadForm(imageBytes("jpg", MAX_UPLOAD_BYTES + 1)));
    expect(reply.status).toBe(400);
    expect(reply.body.errors).toEqual([{ field: "file", message: "Must be 5 MB or smaller" }]);
  });

  it("create_acceptsExactlyFiveMb", async () => {
    expect((await upload(uploadForm(imageBytes("jpg", MAX_UPLOAD_BYTES)))).status).toBe(201);
  });

  it("create_stopsAMuchLargerBodyBeforeReadingIt", async () => {
    const reply = await upload(uploadForm(imageBytes("jpg", 2 * MAX_UPLOAD_BYTES)));
    expect(reply).toMatchObject({ status: 413, body: { code: "tt_htt_413" } });
  });

  it("create_refusesAnUnknownPurposeAndAMissingFile", async () => {
    const wrongPurpose = await upload(uploadForm(imageBytes(), "SELFIE"));
    expect(wrongPurpose.body.errors.map((e: { field: string }) => e.field)).toEqual(["purpose"]);
    const form = new FormData();
    form.append("purpose", "PHOTO");
    const noFile = await upload(form);
    expect(noFile.body.errors.map((e: { field: string }) => e.field)).toEqual(["file"]);
  });

  it("create_refusesJson", async () => {
    const reply = await call("POST", "/v1/files", asStaff(tenant), { purpose: "PHOTO" });
    expect(reply).toMatchObject({ status: 400, body: { code: "tt_htt_400" } });
  });
});

describe("SIG-05 file upload permissions", () => {
  let tenant: TestTenant;
  beforeAll(async () => {
    tenant = await createTenant();
  });

  it("ownerAndManager_canUpload", async () => {
    for (const who of [tenant.owner, tenant.manager]) {
      const reply = await call("POST", "/v1/files", asStaff(tenant, who), uploadForm(imageBytes()));
      expect(reply.status).toBe(201);
    }
  });

  it("frontDesk_cannotUpload", async () => {
    const as = asStaff(tenant, tenant.frontDesk);
    const reply = await call("POST", "/v1/files", as, uploadForm(imageBytes()));
    expect(reply).toMatchObject({ status: 403, body: { code: "tt_htt_403" } });
  });

  it("someoneNotSignedIn_cannotUpload", async () => {
    const reply = await call(
      "POST",
      "/v1/files",
      { tenantSlug: tenant.slug },
      uploadForm(imageBytes()),
    );
    expect(reply.status).toBe(401);
  });
});
