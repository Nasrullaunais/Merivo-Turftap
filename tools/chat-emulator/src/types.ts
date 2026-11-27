export type Role = "tx" | "rx" | "sys" | "err";

export interface ChatMessage {
  id: string;
  role: Role;
  text: string;
  time: string;
}

export interface Settings {
  /** Meta's id of the tenant's WhatsApp number, as linked with `bun run whatsapp:link`. */
  businessNumberId: string;
  /** The customer's phone, like +94771234567. */
  phone: string;
}

/** A message the Assistant sent to pretend Meta. */
export interface InboxMessage {
  id: number;
  messageId: string;
  text: string;
  sentAt: string;
}
