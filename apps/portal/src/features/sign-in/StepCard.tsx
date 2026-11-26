import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  icon: LucideIcon;
  /** A `tt-hue-*` class: what the step is about. */
  hue: string;
  title: string;
  body: string;
  children: ReactNode;
};

/** One sign-in step: what we ask and why, then the one field that answers it. */
export function StepCard({ icon: Icon, hue, title, body, children }: Props) {
  return (
    <section className="tt-panel mx-auto grid w-full max-w-md animate-tt-rise gap-5 p-6">
      <header className="grid justify-items-start gap-3">
        <span className={`tt-tile ${hue} size-12 animate-tt-pop rounded-2xl`}>
          <Icon size={24} aria-hidden />
        </span>
        <div className="grid gap-1">
          <h1 className="text-xl font-semibold tracking-tight text-balance">{title}</h1>
          <p className="text-sm text-pretty text-muted">{body}</p>
        </div>
      </header>
      {children}
    </section>
  );
}
