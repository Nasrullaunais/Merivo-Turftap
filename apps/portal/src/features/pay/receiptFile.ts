import { MAX_UPLOAD_BYTES } from "@turftap/contract";

const RECEIPT_TYPES = ["image/jpeg", "image/png", "application/pdf"];
// Some phones send no type for a file; its name is the only hint before the API reads the bytes.
const RECEIPT_NAME = /\.(jpe?g|png|pdf)$/i;

export type ReceiptProblem = "wrongType" | "tooBig";

/** PAY-02: what is wrong with a picked file, checked before it is uploaded. */
export function problemWith(file: File): ReceiptProblem | undefined {
  const typeOk = file.type ? RECEIPT_TYPES.includes(file.type) : RECEIPT_NAME.test(file.name);
  if (!typeOk) return "wrongType";
  if (file.size > MAX_UPLOAD_BYTES) return "tooBig";
  return undefined;
}

export const isPdf = (file: File) => file.type === "application/pdf" || /\.pdf$/i.test(file.name);
