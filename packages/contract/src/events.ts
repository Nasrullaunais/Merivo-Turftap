import { z } from "zod";

import { Id } from "./common";

export const LIVE_EVENT_TYPES = ["booking.changed", "payment.changed"] as const;

/** Something changed on the server (D-11). It carries only what changed; the screen refetches it. */
export const LiveEvent = z
  .object({ type: z.enum(LIVE_EVENT_TYPES), id: Id })
  .meta({ id: "LiveEvent" });

export type LiveEvent = z.output<typeof LiveEvent>;
export type LiveEventType = LiveEvent["type"];
