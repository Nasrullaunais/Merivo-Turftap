import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";

import m from "../../i18n/en/booking";

const COPIED_SHOWN_MS = 1600;

type Props = {
  label: string;
  value: string;
  /** What goes on the clipboard when it differs from what is shown, such as digits only. */
  copyText?: string;
  /** White text for the bank card, or dark text on a light panel. */
  onCard?: boolean;
  className?: string;
  valueClassName?: string;
};

/** One bank detail. Tapping it copies it, so typing it into a banking app is one paste. */
export function CopyRow({
  label,
  value,
  copyText = value,
  onCard = false,
  className = "",
  valueClassName = "text-base",
}: Props) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), COPIED_SHOWN_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = () =>
    void navigator.clipboard?.writeText(copyText).then(
      () => setCopied(true),
      () => setCopied(false),
    );

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={m.pay.copy(label)}
      data-copied={copied}
      className={`tt-t1 group flex min-w-0 items-center justify-between gap-2 rounded-xl px-3 py-2 text-left active:scale-[0.98] ${onCard ? "hover:bg-white/12 data-[copied=true]:bg-white/16" : "hover:bg-[color-mix(in_oklab,var(--tt-hue)_10%,var(--tt-panel))]"} ${className}`}
    >
      <span className="grid min-w-0">
        <span className={`text-xs ${onCard ? "text-white/70" : "text-muted"}`}>{label}</span>
        <span className={`truncate font-semibold tabular-nums ${valueClassName}`}>{value}</span>
      </span>
      <span
        className={`tt-t1 inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2 text-xs font-medium ${
          copied
            ? onCard
              ? "bg-white text-[var(--tt-hue-money)]"
              : "tt-tone-good tt-pill"
            : onCard
              ? "text-white/60 group-hover:text-white"
              : "text-muted group-hover:text-[var(--tt-hue)]"
        }`}
      >
        {copied ? (
          <Check size={14} strokeWidth={3} aria-hidden className="animate-tt-pop" />
        ) : (
          <Copy size={15} aria-hidden />
        )}
        {copied && <span role="status">{m.pay.copied}</span>}
      </span>
    </button>
  );
}
