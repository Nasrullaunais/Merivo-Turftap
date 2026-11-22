import { CreateBucketCommand, S3Client } from "@aws-sdk/client-s3";
import { describe } from "bun:test";

import { objectStorageContract } from "../../../ports/object-storage.contract-test";
import { createS3ObjectStorage } from "./s3-object-storage";

const endpoint = process.env.TEST_S3_ENDPOINT;
const settings = {
  endpoint: endpoint ?? "",
  region: "us-east-1",
  bucket: "turftap-test",
  accessKeyId: process.env.TEST_S3_ACCESS_KEY_ID ?? "turftap",
  secretAccessKey: process.env.TEST_S3_SECRET_ACCESS_KEY ?? "turftap-secret",
};

// Needs a running S3 store (`docker compose up -d seaweedfs`), so it runs only when one is named.
describe.skipIf(!endpoint)("s3 adapter", () => {
  objectStorageContract(
    "s3",
    async () => {
      const client = new S3Client({ ...settings, forcePathStyle: true, credentials: settings });
      await client
        .send(new CreateBucketCommand({ Bucket: settings.bucket }))
        .catch(() => undefined);
      return createS3ObjectStorage(settings);
    },
    { servesUrls: true },
  );
});
