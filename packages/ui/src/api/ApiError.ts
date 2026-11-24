import type { ErrorReply, FieldError } from "@turftap/contract";

/** Any failed API call, whatever went wrong: a reply with an error envelope, or no reply at all. */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly traceId?: string;
  readonly fieldErrors: FieldError[];
  /** D-10: the venue's dates a Repeat Series can't be booked on. */
  readonly clashingDates: string[];

  constructor(status: number, message: string, reply?: Partial<ErrorReply>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = reply?.code;
    this.traceId = reply?.traceId;
    this.fieldErrors = reply?.errors ?? [];
    this.clashingDates = reply?.clashingDates ?? [];
  }
}

const NO_REPLY = 0;

export function toApiError(error: unknown, response: Response | undefined): ApiError {
  if (error instanceof ApiError) return error;
  const reply = error && typeof error === "object" ? (error as Partial<ErrorReply>) : undefined;
  const message =
    typeof reply?.message === "string"
      ? reply.message
      : error instanceof Error
        ? error.message
        : (response?.statusText ?? "Network error");
  return new ApiError(response?.status ?? NO_REPLY, message, reply);
}
