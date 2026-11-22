import {
  DeleteObjectCommand,
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type { ObjectStorage } from "../../../ports/object-storage";

type S3Settings = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
};

/** Works with any S3-compatible store; TurfTap points it at SeaweedFS. */
export function createS3ObjectStorage(settings: S3Settings): ObjectStorage {
  const client = new S3Client({
    endpoint: settings.endpoint,
    region: settings.region,
    forcePathStyle: true,
    credentials: { accessKeyId: settings.accessKeyId, secretAccessKey: settings.secretAccessKey },
  });
  const Bucket = settings.bucket;

  return {
    async save(key, file) {
      await client.send(
        new PutObjectCommand({ Bucket, Key: key, Body: file.body, ContentType: file.contentType }),
      );
    },
    async read(key) {
      try {
        const reply = await client.send(new GetObjectCommand({ Bucket, Key: key }));
        const body = await reply.Body?.transformToByteArray();
        return body && { body, contentType: reply.ContentType ?? "application/octet-stream" };
      } catch (error) {
        if (error instanceof NoSuchKey) return undefined;
        throw error;
      }
    },
    async remove(key) {
      await client.send(new DeleteObjectCommand({ Bucket, Key: key }));
    },
    downloadUrl: (key, expiresIn) =>
      getSignedUrl(client, new GetObjectCommand({ Bucket, Key: key }), { expiresIn }),
  };
}
