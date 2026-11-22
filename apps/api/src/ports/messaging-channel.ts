/** A WhatsApp message to send. `from` is the sending number's id; login codes use the TurfTap number. */
export type OutgoingMessage =
  | { kind: "text"; from: string; to: string; text: string }
  | { kind: "template"; from: string; to: string; template: string; values: string[] }
  | { kind: "login-code"; to: string; code: string };

export interface MessagingChannel {
  send(message: OutgoingMessage): Promise<void>;
}
