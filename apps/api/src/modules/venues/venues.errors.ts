import type { PriceRule } from "@turftap/contract";

import { constraintErrors, Conflict, NotFound } from "../../lib/errors";

const WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
type TimeWindow = { startsAt: Date; endsAt: Date };
/** "Fri 25 Dec, 10:00", in the venue's own time zone. */
const describeInstant = (instant: Date, timeZone: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(instant);

const describeRule = (rule: PriceRule) =>
  `${rule.weekdays.map((day) => WEEKDAY_NAMES[day - 1]).join(", ")} ${rule.startTime}–${rule.endTime}`;

export const venueErrors = {
  notFound: (id: number) => new NotFound("tt_ven_001", `Venue ${id} was not found`),
  nameTaken: () => new Conflict("tt_ven_002", "Another venue already has this name"),
  resourceNotFound: (id: number) => new NotFound("tt_ven_003", `Resource ${id} was not found`),
  resourceNameTaken: () =>
    new Conflict("tt_ven_004", "Another resource at this venue already has this name"),
  priceRuleNotFound: (id: number) => new NotFound("tt_ven_005", `Price Rule ${id} was not found`),
  /** Without `clashing`, the database caught a clash that two people saved at the same time. */
  priceRuleClash: (clashing?: PriceRule) =>
    new Conflict(
      "tt_ven_006",
      clashing
        ? `This overlaps the Price Rule for ${describeRule(clashing)}`
        : "This overlaps another Price Rule for this resource",
    ),
  closedDateNotFound: (id: number) => new NotFound("tt_ven_007", `Closed Date ${id} was not found`),
  alreadyClosed: () => new Conflict("tt_ven_008", "This venue is already closed on that date"),
  blockedTimeNotFound: (id: number) =>
    new NotFound("tt_ven_009", `Blocked Time ${id} was not found`),
  /** Without `clashing`, the database caught a clash that two people saved at the same time. */
  blockedTimeClash: (clashing?: TimeWindow, timeZone?: string) =>
    new Conflict(
      "tt_ven_010",
      clashing && timeZone
        ? `This overlaps the Blocked Time from ${describeInstant(clashing.startsAt, timeZone)} to ${describeInstant(clashing.endsAt, timeZone)}`
        : "This overlaps another Blocked Time for this resource",
    ),
  photoNotFound: (id: number) => new NotFound("tt_ven_011", `Photo ${id} was not found`),
  photoFileInUse: () => new Conflict("tt_ven_012", "This file is already used by another photo"),
  intervalMisfitsPriceRule: (rule: PriceRule) =>
    new Conflict(
      "tt_ven_013",
      `This Start Interval doesn't fit the Price Rule for ${describeRule(rule)}. Change or delete that rule first`,
    ),
};

constraintErrors({
  venues_tenant_name_unique: venueErrors.nameTaken,
  resources_venue_name_unique: venueErrors.resourceNameTaken,
  price_rules_no_overlap: () => venueErrors.priceRuleClash(),
  closed_dates_venue_date_unique: venueErrors.alreadyClosed,
  blocked_times_no_overlap: () => venueErrors.blockedTimeClash(),
  photos_file_unique: venueErrors.photoFileInUse,
});
