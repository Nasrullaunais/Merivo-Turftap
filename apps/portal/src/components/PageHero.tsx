import { Backdrop } from "./Backdrop";
import type { Offer } from "./sportLook";

type Props = {
  photoOf?: { venueId: number } | { resourceId: number };
  scenes: readonly Offer[];
  alt: string;
  /** Sits in the top corner, such as whether it is open or free today. */
  badge?: React.ReactNode;
  icon: React.ReactNode;
  title: React.ReactNode;
  /** The line under the title. */
  children?: React.ReactNode;
};

/** The top of a sport's, a gym's or a court's page: its picture with the name and one line on it. */
export function PageHero({ photoOf, scenes, alt, badge, icon, title, children }: Props) {
  return (
    <header className="relative isolate grid aspect-[16/9] animate-tt-fade content-end overflow-hidden rounded-3xl text-white sm:aspect-[21/8]">
      <Backdrop photoOf={photoOf} scenes={scenes} alt={alt} />
      {badge && <div className="absolute top-4 left-4">{badge}</div>}
      <div className="flex items-end gap-3 p-5 sm:p-7">
        <span className="grid size-14 shrink-0 animate-tt-pop place-items-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur-md">
          {icon}
        </span>
        <div className="grid min-w-0 gap-0.5">
          <h1 className="animate-tt-rise truncate text-3xl font-semibold tracking-tight [animation-delay:60ms]">
            {title}
          </h1>
          <div className="h-5 animate-tt-rise truncate text-sm text-white/80 [animation-delay:100ms]">
            {children}
          </div>
        </div>
      </div>
    </header>
  );
}
