import { Skeleton } from "@heroui/react";
import { createFileRoute, Navigate, redirect, useRouter } from "@tanstack/react-router";
import { Id } from "@turftap/contract";
import { CalendarCheck } from "lucide-react";

import m from "../i18n/en/booking";
import { isSignedIn } from "../lib/auth/session";
import { useMyCustomer } from "../lib/customer/useMyCustomer";

type BookSearch = { resourceId?: number; startsAt?: string; count?: number };

/** BKG-02 placeholder: booking (T30) starts from here, once the customer is signed in (POR-03). */
export const Route = createFileRoute("/book")({
  validateSearch: (search): BookSearch => ({
    resourceId: Id.safeParse(Number(search.resourceId)).data,
    startsAt: typeof search.startsAt === "string" ? search.startsAt : undefined,
    count: Id.safeParse(Number(search.count)).data,
  }),
  beforeLoad: ({ location }) => {
    if (!isSignedIn()) throw redirect({ to: "/sign-in", search: { back: location.href } });
  },
  component: BookPage,
});

function BookPage() {
  const router = useRouter();
  const mine = useMyCustomer({ enabled: true });

  if (mine.data === null) {
    const back = router.state.location.href;
    return <Navigate to="/sign-in" search={{ back }} replace />;
  }
  return (
    <div className="tt-panel mx-auto grid max-w-md animate-tt-rise justify-items-center gap-3 px-6 py-12 text-center">
      <span className="tt-tile tt-hue-booking size-14 animate-tt-pop rounded-2xl">
        <CalendarCheck size={28} aria-hidden />
      </span>
      {mine.data ? (
        <h1 className="animate-tt-fade text-xl font-semibold tracking-tight">
          {m.title(mine.data.name)}
        </h1>
      ) : (
        <Skeleton className="h-7 w-48 rounded-md" />
      )}
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
