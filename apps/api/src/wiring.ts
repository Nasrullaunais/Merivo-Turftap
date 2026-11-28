import { createAuth0AuthProvider } from "./adapters/auth-provider/auth0/auth0-auth-provider";
import { createFakeAuthProvider } from "./adapters/auth-provider/fake/fake-auth-provider";
import { createFakeMessagingChannel } from "./adapters/messaging-channel/fake/fake-messaging-channel";
import { createFakeObjectStorage } from "./adapters/object-storage/fake/fake-object-storage";
import { createS3ObjectStorage } from "./adapters/object-storage/s3/s3-object-storage";
import { createFakeReceiptReader } from "./adapters/receipt-reader/fake/fake-receipt-reader";
import { createGeminiReceiptReader } from "./adapters/receipt-reader/gemini/gemini-receipt-reader";
import { createFakeSmsChannel } from "./adapters/sms-channel/fake/fake-sms-channel";
import type { Config } from "./lib/config";
import type { Ports } from "./ports";

export function createPorts(config: Config): Ports {
  const { auth, storage, receiptReader } = config;
  return {
    auth:
      auth.provider.kind === "auth0"
        ? createAuth0AuthProvider(auth.provider)
        : createFakeAuthProvider(),
    storage: storage.kind === "s3" ? createS3ObjectStorage(storage) : createFakeObjectStorage(),
    messaging: createFakeMessagingChannel(),
    sms: createFakeSmsChannel(),
    receiptReader:
      receiptReader.kind === "gemini"
        ? createGeminiReceiptReader(receiptReader)
        : createFakeReceiptReader(),
  };
}
