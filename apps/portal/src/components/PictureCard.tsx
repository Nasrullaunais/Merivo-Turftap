import { ArrowRight } from "lucide-react";

import { Backdrop } from "./Backdrop";
import type { Offer } from "./sportLook";

/** Put on the card's one link, so a tap anywhere on the card follows it. */
export const STRETCHED_LINK =
  "outline-none after:absolute after:inset-0 after:rounded-3xl after:content-[''] focus-visible:after:ring-4 focus-visible:after:ring-[var(--accent)] focus-visible:after:ring-inset";

type Props = {
  photoOf?: { venueId: number } | { resourceId: number };
  scenes: readonly Offer[];
  alt: string;
  /** Sits in the top corner, such as when it is free today. */
  badge?: React.ReactNode;
  /** The heading, holding the card's link. */
  title: React.ReactNode;
  icon: React.ReactNode;
  /** The arrow fills with this hue under the pointer: the booking teal, or orange for the gym. */
  hue?: "booking" | "membership";
  className?: string;
  children?: React.ReactNode;
};

/** A tappable picture with its name and details over the darkened bottom, and an arrow that leads on. */
export function PictureCard(props: Props) {
  const {
    photoOf,
    scenes,
    alt,
    badge,
    title,
    icon,
    hue = "booking",
    className = "",
    children,
  } = props;
  return (
    <article
      className={`group relative isolate flex h-full flex-col justify-end overflow-hidden rounded-3xl text-white shadow-[var(--tt-shadow-card)] transition-[translate,box-shadow,scale] duration-200 ease-[var(--tt-ease)] hover:-translate-y-1 hover:shadow-[var(--tt-shadow-raised)] has-[a:active]:scale-[0.98] ${className}`}
    >
      <Backdrop photoOf={photoOf} scenes={scenes} alt={alt} />
      {badge && <div className="absolute top-4 left-4">{badge}</div>}
      <div className="flex items-end gap-3 p-5">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur-md">
          {icon}
        </span>
        <div className="grid min-w-0 flex-1 gap-0.5">
          <h3 className="truncate text-xl font-semibold tracking-tight">{title}</h3>
          {children}
        </div>
        <span
          aria-hidden
          className={`tt-hue-${hue} grid size-11 shrink-0 place-items-center rounded-full bg-white text-[#111] transition-[background-color,color,translate] duration-200 group-hover:translate-x-0.5 group-hover:bg-[var(--tt-hue)] group-hover:text-white`}
        >
          <ArrowRight size={20} />
        </span>
      </div>
    </article>
  );
}
