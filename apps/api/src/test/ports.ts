import { createFakeAuthProvider } from "../adapters/auth-provider/fake/fake-auth-provider";
import { createFakeMessagingChannel } from "../adapters/messaging-channel/fake/fake-messaging-channel";
import { createFakeObjectStorage } from "../adapters/object-storage/fake/fake-object-storage";
import { createFakeReceiptReader } from "../adapters/receipt-reader/fake/fake-receipt-reader";
import { createFakeSmsChannel } from "../adapters/sms-channel/fake/fake-sms-channel";

export const testPorts = {
  auth: createFakeAuthProvider(),
  storage: createFakeObjectStorage(),
  messaging: createFakeMessagingChannel(),
  sms: createFakeSmsChannel(),
  receiptReader: createFakeReceiptReader(),
};
