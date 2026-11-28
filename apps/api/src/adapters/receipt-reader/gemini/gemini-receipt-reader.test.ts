import { describe, expect, it, setDefaultTimeout } from "bun:test";

import type { StoredFile } from "../../../ports/object-storage";
import type { ReceiptReading } from "../../../ports/receipt-reader";
import { receiptReaderContract } from "../../../ports/receipt-reader.contract-test";
import { createGeminiReceiptReader } from "./gemini-receipt-reader";

const MODEL = process.env.RECEIPT_READER_MODEL ?? "gemini-3.8-flash";
const GEMINI_TIMEOUT_MS = 60_000;
const apiKey = process.env.TEST_GEMINI_API_KEY;
if (apiKey) setDefaultTimeout(GEMINI_TIMEOUT_MS);

async function sample(name: string, contentType: string): Promise<StoredFile> {
  const body = await Bun.file(new URL(`samples/${name}`, import.meta.url)).bytes();
  return { body, contentType };
}

// Made-up receipts: the names, accounts and references on them are invented.
const SAMPLES = [
  {
    name: "transfer-app.png",
    contentType: "image/png",
    expected: {
      amount: { amount: 300000, currency: "LKR" as const },
      paidOn: "2026-11-24",
      bank: "Sampath Bank",
      reference: "SB2611245821",
    },
  },
  {
    name: "cash-deposit.jpg",
    contentType: "image/jpeg",
    expected: {
      amount: { amount: 450000, currency: "LKR" as const },
      paidOn: "2026-11-18",
      bank: "Commercial Bank",
      reference: "004871",
    },
  },
  {
    name: "e-receipt.pdf",
    contentType: "application/pdf",
    expected: {
      amount: { amount: 1250050, currency: "LKR" as const },
      paidOn: "2026-11-26",
      bank: "Hatton National Bank",
      reference: "HNB/IB/7730215",
    },
  },
];

// Calls Google with a real key, so it runs only when one is given.
describe.skipIf(!apiKey)("gemini adapter", () => {
  for (const { name, contentType, expected } of SAMPLES) {
    receiptReaderContract(`gemini, ${name}`, async () => ({
      reader: createGeminiReceiptReader({ apiKey: apiKey!, model: MODEL }),
      receipt: await sample(name, contentType),
      expected,
    }));
  }
});

/** Shaped like Gemini's real replies to generateContent. */
function geminiAnswer(answer: object) {
  const candidate = {
    content: { role: "model", parts: [{ text: JSON.stringify(answer) }] },
    finishReason: "STOP",
    index: 0,
  };
  return Response.json({ candidates: [candidate], modelVersion: MODEL });
}

function geminiError(code: number, status: string) {
  return Response.json({ error: { code, message: "Something failed", status } }, { status: code });
}

const RECEIPT = {
  isReceipt: true,
  amount: 3000,
  currency: "LKR",
  paidOn: "2026-11-24",
  bank: "Sampath Bank",
  reference: "SB2611245821",
};
const READING: ReceiptReading = {
  amount: { amount: 300000, currency: "LKR" },
  paidOn: "2026-11-24",
  bank: "Sampath Bank",
  reference: "SB2611245821",
};

/** Gemini on the other end of the line, giving `replies` in turn. */
function readerFacing(...replies: (() => Response | Promise<Response>)[]) {
  const calls: string[] = [];
  const sentBodies: unknown[] = [];
  const fakeFetch = async (url: string | URL | Request, init?: RequestInit) => {
    calls.push(String(url));
    sentBodies.push(JSON.parse(String(init?.body)));
    const reply = replies[Math.min(calls.length, replies.length) - 1]!;
    return reply();
  };
  const reader = createGeminiReceiptReader({
    apiKey: "test-key",
    model: MODEL,
    // Only fetch(url, init) is called, so the Bun-only extras of `fetch` aren't needed.
    fetch: fakeFetch as typeof fetch,
    retryDelaySeconds: 0,
  });
  return { reader, calls, sentBodies };
}

const photo = { body: new Uint8Array([0xff, 0xd8, 0xff, 1]), contentType: "image/jpeg" };

describe("gemini adapter, offline", () => {
  it("read_givesTheAmountInCents", async () => {
    const { reader } = readerFacing(() => geminiAnswer({ ...RECEIPT, amount: 12500.5 }));
    expect(await reader.read(photo)).toEqual({
      ...READING,
      amount: { amount: 1250050, currency: "LKR" },
    });
  });

  it("read_asksForLowThinking", async () => {
    const { reader, sentBodies } = readerFacing(() => geminiAnswer(RECEIPT));
    await reader.read(photo);
    expect(sentBodies[0]).toMatchObject({
      generationConfig: { thinkingConfig: { thinkingLevel: "LOW" } },
    });
  });

  it("read_retriesAServerError_thenGivesTheReading", async () => {
    const { reader, calls } = readerFacing(
      () => geminiError(503, "UNAVAILABLE"),
      () => geminiAnswer(RECEIPT),
    );
    expect(await reader.read(photo)).toEqual(READING);
    expect(calls).toHaveLength(2);
  });

  it("read_retriesATimeout", async () => {
    const { reader, calls } = readerFacing(
      () => Promise.reject(new DOMException("The operation timed out.", "TimeoutError")),
      () => geminiAnswer(RECEIPT),
    );
    expect(await reader.read(photo)).toEqual(READING);
    expect(calls).toHaveLength(2);
  });

  it("read_whenGeminiStaysDown_isUnreadable", async () => {
    const { reader, calls } = readerFacing(() => geminiError(500, "INTERNAL"));
    expect(await reader.read(photo)).toBeUndefined();
    expect(calls).toHaveLength(3);
  });

  it("read_aRefusedRequest_isUnreadable_withoutRetrying", async () => {
    for (const [code, status] of [
      [400, "INVALID_ARGUMENT"],
      [403, "PERMISSION_DENIED"],
      [429, "RESOURCE_EXHAUSTED"],
    ] as const) {
      const { reader, calls } = readerFacing(() => geminiError(code, status));
      expect(await reader.read(photo)).toBeUndefined();
      expect(calls).toHaveLength(1);
    }
  });

  it("read_anAnswerNotInTheAgreedShape_isUnreadable", async () => {
    for (const answer of [{ note: "I can't read this" }, { ...RECEIPT, paidOn: "24/11/2026" }]) {
      const { reader } = readerFacing(() => geminiAnswer(answer));
      expect(await reader.read(photo)).toBeUndefined();
    }
  });

  it("read_somethingThatIsNotAReceipt_isUnreadable", async () => {
    const { reader } = readerFacing(() => geminiAnswer({ ...RECEIPT, isReceipt: false }));
    expect(await reader.read(photo)).toBeUndefined();
  });

  it("read_anAmountInAnotherCurrency_leavesTheAmountOut", async () => {
    const { reader } = readerFacing(() => geminiAnswer({ ...RECEIPT, currency: "USD" }));
    expect(await reader.read(photo)).toEqual({ ...READING, amount: null });
  });

  it("read_aFileTypeItCannotRead_isUnreadable_withoutAsking", async () => {
    const { reader, calls } = readerFacing(() => geminiAnswer(RECEIPT));
    expect(await reader.read({ ...photo, contentType: "text/plain" })).toBeUndefined();
    expect(calls).toHaveLength(0);
  });
});
