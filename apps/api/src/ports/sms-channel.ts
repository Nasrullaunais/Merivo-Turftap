export type OutgoingSms = { to: string; text: string };

export interface SmsChannel {
  send(sms: OutgoingSms): Promise<void>;
}
