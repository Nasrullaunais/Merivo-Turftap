import type { StoredFile } from "./object-storage";

/** What the AI read from a transfer receipt. A field it could not read is `null`. */
export type ReceiptReading = {
  amount: { amount: number; currency: "LKR" } | null;
  paidOn: string | null;
  bank: string | null;
  reference: string | null;
};

export interface ReceiptReader {
  /**
   * Resolves to `undefined` when the image can't be read, also when the reader itself fails after
   * its retries. Never rejects: staff then check the receipt by hand.
   */
  read(file: StoredFile): Promise<ReceiptReading | undefined>;
}
