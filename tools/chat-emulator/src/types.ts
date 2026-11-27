export type Role = "tx" | "rx" | "sys" | "err";

export interface ChatMessage {
  id: string;
  role: Role;
  text: string;
  time: string;
  /** Reply buttons or list rows the Assistant sent with the text. */
  choices?: Choices;
  /** The small grey line under the text, like WhatsApp's message footer. */
  footer?: string;
}

export interface Choice {
  id: string;
  title: string;
}

export interface Choices {
  kind: "button" | "list";
  /** The id of the Assistant's message, which a tap replies to. */
  messageId: string;
  /** The label of the button that opens a list. */
  listButton?: string;
  options: Choice[];
}

/** Meta's `interactive` object, as the Assistant sent it. */
export interface Interactive {
  type: "button" | "list";
  body: { text: string };
  footer?: { text: string };
  action: {
    buttons?: { type: "reply"; reply: Choice }[];
    button?: string;
    sections?: { title?: string; rows: Choice[] }[];
  };
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
  interactive: Interactive | null;
  sentAt: string;
}
