import type { AuthProvider } from "./auth-provider";
import type { MessagingChannel } from "./messaging-channel";
import type { ObjectStorage } from "./object-storage";
import type { ReceiptReader } from "./receipt-reader";
import type { SmsChannel } from "./sms-channel";

export type Ports = {
  auth: AuthProvider;
  storage: ObjectStorage;
  messaging: MessagingChannel;
  sms: SmsChannel;
  receiptReader: ReceiptReader;
};

let installed: Ports | undefined;

/** Called once at start-up by `wiring.ts`, or by the test setup with fakes. */
export function installPorts(ports: Ports): void {
  installed = ports;
}

export function ports(): Ports {
  if (!installed) throw new Error("Ports are not installed; call installPorts() at start-up");
  return installed;
}
