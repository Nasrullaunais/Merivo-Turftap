import type { PlanLengthUnit } from "@turftap/contract";

export default {
  title: "Membership Plans",
  loading: "Loading Membership Plans",
  byState: "Membership Plans by state",
  allPlans: "All plans",
  onSale: "On sale",
  turnedOff: "Turned off",
  noGyms: "No venue has a gym yet. An Owner turns it on in the Gym box on a venue's page.",
  noneAtVenue: "No plans at this venue yet.",
  noneShown: "No plans match.",
  /** "1 month", "10 days". */
  length: (count: number, unit: PlanLengthUnit) =>
    `${count} ${unit === "DAYS" ? (count === 1 ? "day" : "days") : count === 1 ? "month" : "months"}`,
  addTitle: "Add a plan",
  venueLabel: "Venue",
  nameLabel: "Name",
  lengthLabel: "Length",
  unitLabel: "Days or months",
  lengthHint: (maxDays: number, maxMonths: number) =>
    `Up to ${maxDays} days or ${maxMonths} months`,
  lengthInvalid: (max: number, unit: PlanLengthUnit) =>
    `Must be a whole number from 1 to ${max} ${unit === "DAYS" ? "days" : "months"}`,
  units: { DAYS: "Days", MONTHS: "Months" } satisfies Record<PlanLengthUnit, string>,
  priceLabel: "Price (LKR)",
  submit: "Add plan",
  turnOff: "Turn off",
  turnOffFor: (name: string) => `Turn off ${name}`,
  turnOffTitle: (name: string) => `Turn off ${name}?`,
  turnOffHint: "Customers can no longer buy it. Memberships already sold on it keep working.",
  keep: "Keep it",
};
