/** The shared TurfTap number, for messages about TurfTap itself rather than one venue. */
export const TURFTAP_NUMBER = "turftap";

/** Template names as registered with Meta. A new template is added here and approved by Meta first. */
export const WHATSAPP_TEMPLATES = {
  /** Values: tenant name, role, console link. Sent from the TurfTap number (SIG-03). */
  staffInvite: "staff_invite",
  /** Values: tenant name, console link. Sent from the TurfTap number to a new tenant's Owner (PLA-01). */
  ownerWelcome: "owner_welcome",
  /** Values: venue name, resource name, start time in the venue's time zone (BKG-03). */
  bookingExpired: "booking_expired",
  /** Values: venue name, resource name, start time in the venue's time zone, reason (BKG-07). */
  bookingCancelled: "booking_cancelled",
  /** Values: venue name, resource name, start time in the venue's time zone (PAY-04). */
  bookingConfirmed: "booking_confirmed",
  /** Values: venue name, resource name, start time, reason, new time limit to pay by (PAY-05). */
  receiptRejected: "receipt_rejected",
  /** Values: venue name, resource name, first cancelled start time, bookings cancelled, reason (BKG-09). */
  seriesCancelled: "series_cancelled",
  /** Values: venue name, resource name, start time in the venue's time zone (BKG-10). */
  bookingReminder: "booking_reminder",
  /** Values: venue name, plan name, start date, end date (MEM-02, MEM-03). */
  membershipActive: "membership_active",
  /** Values: venue name, plan name, start date (MEM-02, not paid in time). */
  membershipExpired: "membership_expired",
  /** Values: venue name, plan name, start date, reason. */
  membershipCancelled: "membership_cancelled",
  /** Values: venue name, plan name, start date, reason, new time limit to pay by (PAY-05). */
  membershipReceiptRejected: "membership_receipt_rejected",
  /** Values: venue name, plan name, last day (MEM-06, a few days before it ends). */
  membershipEndingSoon: "membership_ending_soon",
} as const;

export type WhatsAppTemplate = (typeof WHATSAPP_TEMPLATES)[keyof typeof WHATSAPP_TEMPLATES];

/** A WhatsApp message to send. `from` is a tenant number's Meta phone number id, or `TURFTAP_NUMBER`. */
export type OutgoingMessage =
  | { kind: "text"; from: string; to: string; text: string }
  | { kind: "template"; from: string; to: string; template: string; values: string[] }
  | { kind: "login-code"; to: string; code: string };

export interface MessagingChannel {
  send(message: OutgoingMessage): Promise<void>;
}
