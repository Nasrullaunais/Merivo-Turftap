import type { PriceRule } from "@turftap/contract";

import { constraintErrors, Conflict, NotFound } from "../../lib/errors";

const WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
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
};

constraintErrors({
  venues_tenant_name_unique: venueErrors.nameTaken,
  resources_venue_name_unique: venueErrors.resourceNameTaken,
  price_rules_no_overlap: () => venueErrors.priceRuleClash(),
  closed_dates_venue_date_unique: venueErrors.alreadyClosed,
});
