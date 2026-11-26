import { Skeleton } from "@heroui/react";
import { type ReactNode, useEffect } from "react";

import { CardSkeletons } from "../components/CardSkeletons";
import m from "../i18n/en/shell";
import { tenantProblemOf } from "../lib/tenant/tenantProblem";
import { useTenant } from "../lib/tenant/useTenant";
import { TenantProblemPage } from "./TenantProblemPage";
import { TopBar } from "./TopBar";

/** Shaped like a page's title and cards, so the page lands without anything moving. */
function PageSkeleton() {
  return (
    <div className="grid gap-5">
      <Skeleton className="h-8 w-40 rounded-md" />
      <CardSkeletons label={m.loading} />
    </div>
  );
}

/** The portal's frame. Pages open only once the tenant is known, so they never fail on their own. */
export function Shell({ children }: { children: ReactNode }) {
  const tenant = useTenant();
  const name = tenant.data?.name;

  useEffect(() => {
    if (name) document.title = name;
  }, [name]);

  if (tenant.isError) {
    return (
      <TenantProblemPage
        problem={tenantProblemOf(tenant.error)}
        onRetry={() => void tenant.refetch()}
        retrying={tenant.isFetching}
      />
    );
  }

  return (
    <div className="relative isolate flex min-h-dvh flex-col">
      <div aria-hidden className="tt-canvas-glow" />
      <TopBar name={name} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-16">
        {name ? children : <PageSkeleton />}
      </main>
    </div>
  );
}
