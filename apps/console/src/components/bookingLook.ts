import type { BookingStatus } from "@turftap/contract";
import {
  CircleCheck,
  CircleX,
  Hourglass,
  type LucideIcon,
  ScanSearch,
  TimerOff,
} from "lucide-react";

import type { Tone } from "./look";

/** Tone and icon per booking state, as console-design.md §3.3 lists them. */
export const BOOKING_TONES: Record<BookingStatus, Tone> = {
  AWAITING_PAYMENT: "watch",
  AWAITING_CHECK: "busy",
  CONFIRMED: "good",
  EXPIRED: "off",
  CANCELLED: "off",
};

export const BOOKING_ICONS: Record<BookingStatus, LucideIcon> = {
  AWAITING_PAYMENT: Hourglass,
  AWAITING_CHECK: ScanSearch,
  CONFIRMED: CircleCheck,
  EXPIRED: TimerOff,
  CANCELLED: CircleX,
};
