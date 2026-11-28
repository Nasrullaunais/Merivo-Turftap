import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { z } from "zod";

import { logger } from "../../../lib/logger";
import type { StoredFile } from "../../../ports/object-storage";
import type { ReceiptReader, ReceiptReading } from "../../../ports/receipt-reader";

type GeminiSettings = {
  apiKey: string;
  model: string;
  /** Tests pass their own; normally the global fetch reaches Google. */
  fetch?: typeof fetch;
  /** Tests set 0 so retries don't wait. */
  retryDelaySeconds?: number;
};

const ATTEMPTS = 3;
const ATTEMPT_TIMEOUT_MS = 60_000;
const DEFAULT_RETRY_DELAY_SECONDS = 1;
// Timeouts and server errors. A timed-out or dropped connection is retried as well.
const RETRIED_STATUSES = [408, 500, 502, 503, 504];
const READABLE_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const CENTS_PER_RUPEE = 100;

const Answer = z.object({
  isReceipt: z.boolean().describe("true only if this is a receipt or confirmation of a payment"),
  amount: z
    .number()
    .nonnegative()
    .nullable()
    .describe("The amount paid as written, in whole units with decimals: 'Rs. 4,500.50' is 4500.5"),
  currency: z
    .string()
    .nullable()
    .describe("ISO 4217 code of the amount's currency. 'Rs.', 'Rs' and 'LKR' are LKR"),
  paidOn: z.iso.date().nullable().describe("The day the payment was made"),
  bank: z
    .string()
    .nullable()
    .describe(
      "The bank that issued this receipt, where the money was paid from or deposited, in its " +
        "usual short name: 'Seylan Bank PLC' is 'Seylan Bank', 'Commercial Bank of Ceylon PLC' " +
        "is 'Commercial Bank', 'Bank of Ceylon' stays 'Bank of Ceylon'",
    ),
  reference: z
    .string()
    .nullable()
    .describe("The transaction's reference, trace or transaction number, exactly as printed"),
});

const PROMPT =
  "This file was sent as proof of a bank transfer or cash deposit in Sri Lanka. Read it. " +
  "Use null for anything that is not clearly shown; never guess.";

export function createGeminiReceiptReader(settings: GeminiSettings): ReceiptReader {
  const ai = new GoogleGenAI({
    apiKey: settings.apiKey,
    httpOptions: {
      timeout: ATTEMPT_TIMEOUT_MS,
      retryOptions: {
        attempts: ATTEMPTS,
        httpStatusCodes: RETRIED_STATUSES,
        initialDelay: settings.retryDelaySeconds ?? DEFAULT_RETRY_DELAY_SECONDS,
      },
      fetch: settings.fetch,
    },
  });

  async function ask(file: StoredFile) {
    const reply = await ai.models.generateContent({
      model: settings.model,
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: file.contentType,
                data: Buffer.from(file.body).toString("base64"),
              },
            },
            { text: PROMPT },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: z.toJSONSchema(Answer),
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });
    return Answer.parse(JSON.parse(reply.text ?? ""));
  }

  return {
    async read(file) {
      if (file.body.byteLength === 0 || !READABLE_TYPES.includes(file.contentType))
        return undefined;
      try {
        return toReading(await ask(file));
      } catch (error) {
        logger.warn({ err: error }, "Gemini could not read a receipt");
        return undefined;
      }
    },
  };
}

function toReading(answer: z.output<typeof Answer>): ReceiptReading | undefined {
  if (!answer.isReceipt) return undefined;
  return {
    amount:
      answer.amount !== null && answer.currency?.toUpperCase() === "LKR"
        ? { amount: Math.round(answer.amount * CENTS_PER_RUPEE), currency: "LKR" }
        : null,
    paidOn: answer.paidOn,
    bank: answer.bank?.trim() || null,
    reference: answer.reference?.trim() || null,
  };
}
