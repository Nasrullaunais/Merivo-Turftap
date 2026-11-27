import { RESOURCE_TYPES, type ResourceType } from "@turftap/contract";
import { Dumbbell, type LucideIcon } from "lucide-react";

import { TYPE_ICONS } from "./resourceLook";

/** The address part of each sport's page, as in `/venues/2/sports/pool`. */
export const SPORT_SLUGS: Record<ResourceType, string> = {
  FUTSAL_COURT: "futsal",
  TABLE_TENNIS_TABLE: "table-tennis",
  POOL_TABLE: "pool",
};

export const sportOfSlug = (slug: string) =>
  RESOURCE_TYPES.find((type) => SPORT_SLUGS[type] === slug);

const GYM_SLUG = "gym";

/** The filter on the venue list, as in `/?offer=pool`. */
export const offerSlug = (offer: Offer) => (offer === "GYM" ? GYM_SLUG : SPORT_SLUGS[offer]);
export const offerOfSlug = (slug: unknown): Offer | undefined =>
  slug === GYM_SLUG ? "GYM" : typeof slug === "string" ? sportOfSlug(slug) : undefined;

/** What a card can show: one of the sports, or the gym. */
export type Offer = ResourceType | "GYM";

/** The gym's icon is on the membership hue; the sports keep the place hue, as in the console. */
export const OFFER_ICONS: Record<Offer, LucideIcon> = { ...TYPE_ICONS, GYM: Dumbbell };

export const OFFER_HUES: Record<Offer, string> = {
  FUTSAL_COURT: "tt-hue-place",
  TABLE_TENNIS_TABLE: "tt-hue-place",
  POOL_TABLE: "tt-hue-place",
  GYM: "tt-hue-membership",
};

type HasType = { type: ResourceType };

/** A venue's sports in a steady order, each with its resources. */
export function bySport<T extends HasType>(resources: readonly T[]) {
  return RESOURCE_TYPES.map((type) => ({
    type,
    resources: resources.filter((resource) => resource.type === type),
  })).filter((sport) => sport.resources.length > 0);
}

/** The sports a venue offers, then its gym when it has one. */
export function offersOf(resources: readonly HasType[], hasGym: boolean): Offer[] {
  const sports: Offer[] = bySport(resources).map((sport) => sport.type);
  return hasGym ? [...sports, "GYM"] : sports;
}
