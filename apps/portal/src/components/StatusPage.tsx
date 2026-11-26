import { BrandMark } from "@turftap/ui";
import { Globe, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { TONE_CLASS, type Tone } from "./look";

type Props = {
  tone: Tone;
  icon: LucideIcon;
  title: string;
  body: string;
  address: string;
  footer: string;
  action?: ReactNode;
};

/** A whole page saying why the portal can't open, in the tone of what went wrong. */
export function StatusPage({ tone, icon: Icon, title, body, address, footer, action }: Props) {
  return (
    <main
      className={`${TONE_CLASS[tone]} relative isolate grid min-h-dvh place-items-center overflow-hidden px-6 pt-12 pb-24`}
    >
      <div aria-hidden className="tt-status-glow" />
      <div className="grid w-full max-w-sm justify-items-center gap-4 text-center">
        <div className="relative mb-2 grid size-28 place-items-center">
          <span aria-hidden className="tt-status-ring" />
          <span aria-hidden className="tt-status-ring [animation-delay:300ms]" />
          <span className="tt-status-badge">
            <Icon size={34} strokeWidth={1.75} />
          </span>
        </div>
        <h1 className="animate-tt-rise text-2xl font-semibold tracking-tight text-balance [animation-delay:120ms]">
          {title}
        </h1>
        <p className="animate-tt-rise text-pretty text-muted [animation-delay:180ms]">{body}</p>
        <p className="tt-address animate-tt-rise [animation-delay:240ms]">
          <Globe size={14} aria-hidden />
          {address}
        </p>
        {action && <div className="mt-2 animate-tt-rise [animation-delay:300ms]">{action}</div>}
      </div>
      <footer className="absolute inset-x-0 bottom-6 flex animate-tt-fade items-center justify-center gap-2 text-xs text-muted [animation-delay:480ms]">
        <BrandMark size={18} />
        {footer}
      </footer>
    </main>
  );
}
