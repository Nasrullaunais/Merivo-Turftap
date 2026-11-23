import { receiptReaderContract } from "../../../ports/receipt-reader.contract-test";
import { createFakeReceiptReader } from "./fake-receipt-reader";

const expected = {
  amount: { amount: 150000, currency: "LKR" as const },
  paidOn: "2026-11-20",
  bank: "Sampath Bank",
  reference: "SB12345",
};

receiptReaderContract("fake", async () => ({
  reader: createFakeReceiptReader(expected),
  receipt: { body: new Uint8Array([1, 2, 3]), contentType: "image/png" },
  expected,
}));
