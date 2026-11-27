import { CirclePause } from "lucide-react";

import { TONE_CLASS } from "../components/look";
import m from "../i18n/en/shell";

/** PLA-03: shown on every page while a Platform Admin has turned the tenant off. */
export function TenantPaused() {
  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 pt-4 sm:px-6">
      <div
        role="status"
        className={`flex animate-tt-rise items-center gap-3 rounded-xl border border-[color-mix(in_oklab,var(--tt-tone)_35%,transparent)] bg-[color-mix(in_oklab,var(--tt-tone)_9%,transparent)] px-4 py-3 ${TONE_CLASS.watch}`}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--tt-tone)] text-white">
          <CirclePause aria-hidden size={20} />
        </span>
        <div className="grid min-w-0 gap-0.5">
          <p className="text-sm font-semibold">{m.paused.title}</p>
          <p className="text-sm text-muted">{m.paused.detail}</p>
        </div>
      </div>
    </div>
  );
}
