import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Id } from "@turftap/contract";
import { CalendarCheck } from "lucide-react";

import m from "../i18n/en/booking";

type BookSearch = { resourceId?: number; startsAt?: string; count?: number };

/** BKG-02 placeholder: signing in (T29) and booking (T30) start from here. */
export const Route = createFileRoute("/book")({
  validateSearch: (search): BookSearch => ({
    resourceId: Id.safeParse(Number(search.resourceId)).data,
    startsAt: typeof search.startsAt === "string" ? search.startsAt : undefined,
    count: Id.safeParse(Number(search.count)).data,
  }),
  component: BookPage,
});

function BookPage() {
  const router = useRouter();
  return (
    <div className="tt-panel mx-auto grid max-w-md animate-tt-rise justify-items-center gap-3 px-6 py-12 text-center">
      <span className="tt-tile tt-hue-booking size-14 animate-tt-pop rounded-2xl">
        <CalendarCheck size={28} aria-hidden />
      </span>
      <h1 className="text-xl font-semibold tracking-tight">{m.title}</h1>
      <p className="text-sm text-pretty text-muted">{m.body}</p>
      <button
        type="button"
        onClick={() => router.history.back()}
        className="tt-t1 mt-2 inline-flex h-10 items-center rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground hover:bg-[var(--accent-hover)] active:scale-[0.97]"
      >
        {m.back}
      </button>
    </div>
  );
}
