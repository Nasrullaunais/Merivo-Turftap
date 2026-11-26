import { Link } from "@tanstack/react-router";
import { SearchX } from "lucide-react";

type Props = { title: string; body: string; home: string };

/** A venue or resource that is gone or turned off: say so, and offer the way back. */
export function NotFoundPanel({ title, body, home }: Props) {
  return (
    <div className="tt-tone-off tt-panel grid animate-tt-rise justify-items-center gap-2 px-6 py-12 text-center">
      <span className="tt-status-badge mb-1 !size-14 !rounded-2xl">
        <SearchX size={26} strokeWidth={1.75} aria-hidden />
      </span>
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      <p className="max-w-xs text-sm text-pretty text-muted">{body}</p>
      <Link
        to="/"
        className="tt-t1 mt-2 inline-flex h-10 items-center rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground hover:bg-[var(--accent-hover)] active:scale-[0.97]"
      >
        {home}
      </Link>
    </div>
  );
}
