import { beforeAll, describe, expect, it } from "bun:test";

import { eq } from "drizzle-orm";

import { db } from "../../lib/db";
import {
  asStaff,
  call,
  createTenant,
  imageBytes,
  type TestTenant,
  uploadForm,
  uploadPhotoFile,
  venueInput,
} from "../../test/fixtures";
import { files } from "./files.tables";

describe("Files tenant isolation", () => {
  let tenantA: TestTenant;
  let tenantB: TestTenant;
  beforeAll(async () => {
    tenantA = await createTenant();
    tenantB = await createTenant();
  });

  it("create_savesTheFileUnderTheCallersTenant", async () => {
    const reply = await call("POST", "/v1/files", asStaff(tenantA), uploadForm(imageBytes()));
    const [row] = await db().select().from(files).where(eq(files.id, reply.body.data.id));
    expect(row?.tenantId).toBe(tenantA.id);
    expect(row?.key).toStartWith(`${tenantA.id}/`);
  });

  it("create_cannotUploadIntoAnotherTenant", async () => {
    const as = { ...asStaff(tenantA), tenantId: tenantB.id };
    const reply = await call("POST", "/v1/files", as, uploadForm(imageBytes()));
    expect(reply.status).toBe(403);
  });

  it("anotherTenant_cannotUseTheFileInAPhoto", async () => {
    const fileOfB = await uploadPhotoFile(asStaff(tenantB));
    const venueOfA = (await call("POST", "/v1/venues", asStaff(tenantA), venueInput())).body.data
      .id;
    const reply = await call("POST", "/v1/photos", asStaff(tenantA), {
      fileId: fileOfB,
      venueId: venueOfA,
    });
    expect(reply).toMatchObject({ status: 404, body: { code: "tt_fil_001" } });
  });
});
