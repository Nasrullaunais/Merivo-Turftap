import type { StoredFile } from "../../../ports/object-storage";
import type { ReceiptReader, ReceiptReading } from "../../../ports/receipt-reader";

/** Answers every receipt with `reading`; tests change it to try other answers. */
export function createFakeReceiptReader(
  reading: ReceiptReading | undefined = {
    amount: { amount: 250000, currency: "LKR" },
    paidOn: "2026-12-01",
    bank: "Commercial Bank",
    reference: "FT0001",
  },
): ReceiptReader & { reading: ReceiptReading | undefined } {
  const reader = {
    reading,
    read: async ({ body }: StoredFile) => (body.byteLength === 0 ? undefined : reader.reading),
  };
  return reader;
}
