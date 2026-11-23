import { describe, expect, it } from "bun:test";

import type { StoredFile } from "./object-storage";
import type { ReceiptReader, ReceiptReading } from "./receipt-reader";

/** `receipt` is a real receipt image and `expected` what it shows, in our words. */
export type ReceiptReaderSetup = {
  reader: ReceiptReader;
  receipt: StoredFile;
  expected: ReceiptReading;
};

export function receiptReaderContract(name: string, setup: () => Promise<ReceiptReaderSetup>) {
  describe(`ReceiptReader: ${name}`, () => {
    it("read_aReceipt_givesWhatItShows", async () => {
      const { reader, receipt, expected } = await setup();
      expect(await reader.read(receipt)).toEqual(expected);
    });

    it("read_givesWholeRupeesInCents_andTheDateAsYearMonthDay", async () => {
      const { reader, receipt } = await setup();
      const reading = await reader.read(receipt);
      expect(reading?.amount?.currency).toBe("LKR");
      expect(Number.isInteger(reading?.amount?.amount)).toBe(true);
      expect(reading?.paidOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("read_anEmptyFile_isUnreadable", async () => {
      const { reader } = await setup();
      const empty = { body: new Uint8Array(), contentType: "image/png" };
      expect(await reader.read(empty)).toBeUndefined();
    });
  });
}
