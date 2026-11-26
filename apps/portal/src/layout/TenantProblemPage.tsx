import { Button } from "@heroui/react";
import { CalendarOff, MapPinOff, RotateCw, WifiOff } from "lucide-react";

import type { Tone } from "../components/look";
import { StatusPage } from "../components/StatusPage";
import m from "../i18n/en/shell";
import type { TenantProblem } from "../lib/tenant/tenantProblem";
import { tenantSlugFrom } from "../lib/tenant/tenantSlug";

const LOOK = {
  notFound: { tone: "off", icon: MapPinOff, text: m.notFound },
  notAvailable: { tone: "watch", icon: CalendarOff, text: m.notAvailable },
  failed: { tone: "bad", icon: WifiOff, text: m.failed },
} satisfies Record<TenantProblem, { tone: Tone; icon: unknown; text: unknown }>;

type Props = { problem: TenantProblem; onRetry: () => void; retrying: boolean };

/** POR-01, PLA-03: an unknown address, a tenant that is off, or no connection. */
export function TenantProblemPage({ problem, onRetry, retrying }: Props) {
  const { tone, icon, text } = LOOK[problem];
  return (
    <StatusPage
      tone={tone}
      icon={icon}
      title={text.title}
      body={text.body}
      address={m.address(tenantSlugFrom(window.location))}
      footer={m.poweredBy}
      action={
        problem === "failed" && (
          <Button variant="primary" onPress={onRetry} isDisabled={retrying}>
            <RotateCw size={16} aria-hidden className={retrying ? "animate-spin" : ""} />
            {m.failed.retry}
          </Button>
        )
      }
    />
  );
}
