/** The shared TurfTap number, for messages about TurfTap itself rather than one venue. */
export const TURFTAP_NUMBER = "turftap";

/** Template names as registered with Meta. A new template is added here and approved by Meta first. */
export const WHATSAPP_TEMPLATES = {
  /** Values: tenant name, role, console link. Sent from the TurfTap number (SIG-03). */
  staffInvite: "staff_invite",
} as const;

/** A WhatsApp message to send. `from` is a tenant number's id, or `TURFTAP_NUMBER`. */
export type OutgoingMessage =
  | { kind: "text"; from: string; to: string; text: string }
  | { kind: "template"; from: string; to: string; template: string; values: string[] }
  | { kind: "login-code"; to: string; code: string };

export interface MessagingChannel {
  send(message: OutgoingMessage): Promise<void>;
}
