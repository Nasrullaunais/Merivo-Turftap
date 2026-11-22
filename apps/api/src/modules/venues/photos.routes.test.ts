import { beforeAll, beforeEach, describe, expect, it } from "bun:test";

import { eq, sql } from "drizzle-orm";

import { db } from "../../lib/db";
import { ports } from "../../ports";
import {
  asStaff,
  call,
  createTenant,
  resourceInput,
  type TestTenant,
  uploadPhotoFile,
  venueInput,
} from "../../test/fixtures";
import { removeStoredFile } from "../files/files.jobs";
import { files } from "../files/files.tables";

type PhotoReply = { id: number; position: number; url: string };

const idsOf = (reply: { body: { data: { content: PhotoReply[] } } }) =>
  reply.body.data.content.map((photo) => photo.id);

describe("VEN-06 venue and resource photos", () => {
  let tenant: TestTenant;
  let venueId: number;
  let resourceId: number;
  beforeEach(async () => {
    tenant = await createTenant();
    venueId = (await call("POST", "/v1/venues", asStaff(tenant), venueInput())).body.data.id;
    resourceId = (await call("POST", "/v1/resources", asStaff(tenant), resourceInput(venueId))).body
      .data.id;
  });

  const addPhoto = async (owner: object) => {
    const fileId = await uploadPhotoFile(asStaff(tenant));
    return call("POST", "/v1/photos", asStaff(tenant), { fileId, ...owner });
  };
  const listOf = (query: string) => call("GET", `/v1/photos?${query}`, asStaff(tenant));

  it("create_addsAVenuePhotoWithADownloadLink", async () => {
    const reply = await addPhoto({ venueId });
    expect(reply.status).toBe(201);
    expect(reply.body.data).toEqual({
      id: expect.any(Number),
      venueId,
      resourceId: null,
      position: 1,
      url: expect.stringMatching(new RegExp(`^http://fake-storage\\.local/${tenant.id}/photos/`)),
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it("create_addsEachNewPhotoLast", async () => {
    const positions = [];
    for (let i = 0; i < 3; i++) positions.push((await addPhoto({ resourceId })).body.data.position);
    expect(positions).toEqual([1, 2, 3]);
    expect((await addPhoto({ venueId })).body.data.position).toBe(1);
  });

  it("create_needsExactlyOneOfVenueOrResource", async () => {
    const fileId = await uploadPhotoFile(asStaff(tenant));
    for (const owner of [{}, { venueId, resourceId }]) {
      const reply = await call("POST", "/v1/photos", asStaff(tenant), { fileId, ...owner });
      expect(reply.status).toBe(400);
      expect(reply.body.errors).toEqual([
        { field: "venueId", message: "Give either venueId or resourceId" },
      ]);
    }
  });

  it("create_refusesAFileAlreadyUsedByAnotherPhoto", async () => {
    const fileId = await uploadPhotoFile(asStaff(tenant));
    await call("POST", "/v1/photos", asStaff(tenant), { fileId, venueId });
    const reply = await call("POST", "/v1/photos", asStaff(tenant), { fileId, resourceId });
    expect(reply).toMatchObject({
      status: 409,
      body: { code: "tt_ven_012", message: "This file is already used by another photo" },
    });
  });

  it("create_refusesAFileThatDoesNotExist", async () => {
    const reply = await call("POST", "/v1/photos", asStaff(tenant), {
      fileId: 999_999_999,
      venueId,
    });
    expect(reply).toMatchObject({ status: 404, body: { code: "tt_fil_001" } });
  });

  it("create_refusesAResourceThatDoesNotExist", async () => {
    const reply = await addPhoto({ resourceId: 999_999_999 });
    expect(reply).toMatchObject({ status: 404, body: { code: "tt_ven_003" } });
  });

  it("list_keepsVenueAndResourcePhotosApartInOrder", async () => {
    const venuePhotos = [
      (await addPhoto({ venueId })).body.data.id,
      (await addPhoto({ venueId })).body.data.id,
    ];
    const resourcePhoto = (await addPhoto({ resourceId })).body.data.id;
    expect(idsOf(await listOf(`venueId=${venueId}`))).toEqual(venuePhotos);
    expect(idsOf(await listOf(`resourceId=${resourceId}`))).toEqual([resourcePhoto]);
  });

  it("list_givesTheSameLinkWithinTheHour", async () => {
    await addPhoto({ venueId });
    const first = (await listOf(`venueId=${venueId}`)).body.data.content[0].url;
    const second = (await listOf(`venueId=${venueId}`)).body.data.content[0].url;
    expect(second).toBe(first);
    const signedAt = new Date(new URL(first).searchParams.get("signedAt")!);
    expect(signedAt.getTime() % (60 * 60 * 1000)).toBe(0);
    expect(new URL(first).searchParams.get("expiresIn")).toBe("7200");
  });

  it("list_isOpenWithOnlyTheTenantSlug", async () => {
    const photo = (await addPhoto({ venueId })).body.data;
    const reply = await call("GET", `/v1/photos?venueId=${venueId}`, { tenantSlug: tenant.slug });
    expect(reply.body.data.content).toEqual([
      expect.objectContaining({ id: photo.id, url: photo.url }),
    ]);
  });

  describe("moving a photo", () => {
    let ids: number[];
    beforeEach(async () => {
      ids = [];
      for (let i = 0; i < 4; i++) ids.push((await addPhoto({ venueId })).body.data.id);
    });
    const move = (id: number, position: number) =>
      call("PATCH", `/v1/photos/${id}`, asStaff(tenant), { position });
    const byIndex = (...indexes: number[]) => indexes.map((index) => ids[index]!);
    const order = async () => idsOf(await listOf(`venueId=${venueId}`));
    const positions = async () =>
      (await listOf(`venueId=${venueId}`)).body.data.content.map((p: PhotoReply) => p.position);

    it("update_makesTheLastPhotoTheCover", async () => {
      const reply = await move(ids[3]!, 1);
      expect(reply.body.data.position).toBe(1);
      expect(await order()).toEqual(byIndex(3, 0, 1, 2));
      expect(await positions()).toEqual([1, 2, 3, 4]);
    });

    it("update_movesTheCoverToTheMiddle", async () => {
      await move(ids[0]!, 3);
      expect(await order()).toEqual(byIndex(1, 2, 0, 3));
    });

    it("update_putsAPositionPastTheEndLast", async () => {
      const reply = await move(ids[1]!, 99);
      expect(reply.body.data.position).toBe(4);
      expect(await order()).toEqual(byIndex(0, 2, 3, 1));
    });

    it("update_refusesPositionZero", async () => {
      expect((await move(ids[1]!, 0)).status).toBe(400);
      expect(await order()).toEqual(ids);
    });

    it("update_leavesTheResourcesPhotosAlone", async () => {
      const resourcePhoto = (await addPhoto({ resourceId })).body.data.id;
      await move(ids[3]!, 1);
      const reply = await listOf(`resourceId=${resourceId}`);
      expect(reply.body.data.content).toEqual([
        expect.objectContaining({ id: resourcePhoto, position: 1 }),
      ]);
    });

    it("delete_closesTheGapAndRemovesTheFile", async () => {
      const [fileRow] = await db()
        .select()
        .from(files)
        .where(sql`${files.id} = (select file_id from photos where id = ${ids[1]!})`);
      const reply = await call("DELETE", `/v1/photos/${ids[1]}`, asStaff(tenant));
      expect(reply.status).toBe(200);
      expect(await order()).toEqual(byIndex(0, 2, 3));
      expect(await positions()).toEqual([1, 2, 3]);
      expect(await db().select().from(files).where(eq(files.id, fileRow!.id))).toEqual([]);

      const { rows } = await db().execute(
        sql`select data from pgboss.job where name = 'remove-stored-file' and data->>'key' = ${fileRow!.key}`,
      );
      expect(rows).toHaveLength(1);
      expect(await ports().storage.read(fileRow!.key)).toBeDefined();
      await removeStoredFile(rows[0]!.data as { key: string });
      expect(await ports().storage.read(fileRow!.key)).toBeUndefined();
    });

    it("delete_repliesNotFoundTheSecondTime", async () => {
      await call("DELETE", `/v1/photos/${ids[0]}`, asStaff(tenant));
      const reply = await call("DELETE", `/v1/photos/${ids[0]}`, asStaff(tenant));
      expect(reply).toMatchObject({ status: 404, body: { code: "tt_ven_011" } });
    });
  });
});

describe("SIG-05 photo permissions", () => {
  let tenant: TestTenant;
  let venueId: number;
  beforeAll(async () => {
    tenant = await createTenant();
    venueId = (await call("POST", "/v1/venues", asStaff(tenant), venueInput())).body.data.id;
  });

  it("manager_canAddMoveAndDeletePhotos", async () => {
    const asManager = asStaff(tenant, tenant.manager);
    const fileId = await uploadPhotoFile(asManager);
    const created = await call("POST", "/v1/photos", asManager, { fileId, venueId });
    expect(created.status).toBe(201);
    const path = `/v1/photos/${created.body.data.id}`;
    expect((await call("PATCH", path, asManager, { position: 1 })).status).toBe(200);
    expect((await call("DELETE", path, asManager)).status).toBe(200);
  });

  it("frontDesk_canSeeButNotAddPhotos", async () => {
    const asFrontDesk = asStaff(tenant, tenant.frontDesk);
    const fileId = await uploadPhotoFile(asStaff(tenant));
    const created = await call("POST", "/v1/photos", asStaff(tenant), { fileId, venueId });
    const path = `/v1/photos/${created.body.data.id}`;
    expect((await call("GET", path, asFrontDesk)).status).toBe(200);
    const reply = await call("POST", "/v1/photos", asFrontDesk, {
      fileId: await uploadPhotoFile(asStaff(tenant)),
      venueId,
    });
    expect(reply).toMatchObject({ status: 403, body: { code: "tt_htt_403" } });
  });

  it("someoneNotSignedIn_cannotOpenOnePhoto", async () => {
    const fileId = await uploadPhotoFile(asStaff(tenant));
    const created = await call("POST", "/v1/photos", asStaff(tenant), { fileId, venueId });
    const reply = await call("GET", `/v1/photos/${created.body.data.id}`, {
      tenantSlug: tenant.slug,
    });
    expect(reply.status).toBe(401);
  });
});
