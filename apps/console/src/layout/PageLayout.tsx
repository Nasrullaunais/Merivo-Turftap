import { Button, Tooltip } from "@heroui/react";
import { PanelLeft } from "lucide-react";
import type { ReactNode } from "react";

import m from "../i18n/en/shell";
import { useShell } from "./useShell";

const WIDTH = { full: "grid", form: "grid max-w-3xl", fill: "flex min-h-0 flex-1 flex-col" };

type Props = {
  title: ReactNode;
  /** A detail page's one-level-up arrow (`BackLink`). */
  back?: ReactNode;
  actions?: ReactNode;
  /** `fill` stretches the content to the bottom of the screen, for a calendar that scrolls inside. */
  width?: keyof typeof WIDTH;
  children: ReactNode;
};

/** Every page's frame, as in gen-ui V2: nav toggle and title in one top row, then the content. */
export function PageLayout({ title, back, actions, width = "full", children }: Props) {
  const { toggleNav } = useShell();
  return (
    <main
      className={`mx-auto w-full max-w-[1600px] px-4 sm:px-6 ${width === "fill" ? "flex h-full min-h-[44rem] flex-col pb-6" : "pb-16"}`}
    >
      <div className="flex h-14 items-center gap-2">
        <Tooltip>
          <Button
            isIconOnly
            variant="ghost"
            aria-label={m.menu}
            onPress={toggleNav}
            className="-ms-2"
          >
            <PanelLeft aria-hidden size={18} className="text-muted" />
          </Button>
          <Tooltip.Content placement="bottom">{m.menu}</Tooltip.Content>
        </Tooltip>
        {back}
        <h1 className="min-w-0 flex-1 truncate text-lg font-semibold tracking-tight">{title}</h1>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <div className={`animate-tt-rise gap-6 pt-2 ${WIDTH[width]}`}>{children}</div>
    </main>
  );
}

/** A record page on a wide screen: the main sections, and a narrower column beside them. */
export function TwoColumns({ main, side }: { main: ReactNode; side: ReactNode }) {
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className="grid min-w-0 gap-6">{main}</div>
      <aside className="grid min-w-0 gap-6 xl:sticky xl:top-4">{side}</aside>
    </div>
  );
}
