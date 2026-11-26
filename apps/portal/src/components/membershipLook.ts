import type { MembershipStatus } from "@turftap/contract";
import {
  BadgeCheck,
  CalendarX,
  CircleX,
  Hourglass,
  type LucideIcon,
  ScanSearch,
  TimerOff,
} from "lucide-react";

import type { Tone } from "./look";

/** Tone and icon per membership state, as console-design.md §3.3 lists them. */
export const MEMBERSHIP_TONES: Record<MembershipStatus, Tone> = {
  AWAITING_PAYMENT: "watch",
  AWAITING_CHECK: "busy",
  ACTIVE: "good",
  EXPIRED: "off",
  CANCELLED: "off",
  ENDED: "off",
};

export const MEMBERSHIP_ICONS: Record<MembershipStatus, LucideIcon> = {
  AWAITING_PAYMENT: Hourglass,
  AWAITING_CHECK: ScanSearch,
  ACTIVE: BadgeCheck,
  EXPIRED: TimerOff,
  CANCELLED: CircleX,
  ENDED: CalendarX,
};
