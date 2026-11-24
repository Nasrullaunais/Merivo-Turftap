import { Button, Tooltip } from "@heroui/react";
import { PanelLeft } from "lucide-react";
import type { ReactNode } from "react";

import m from "../i18n/en/shell";
import { useShell } from "./useShell";

const WIDTH = { full: "max-w-[1600px]", form: "max-w-3xl" };

type Props = {
  title: ReactNode;
  /** A detail page's one-level-up arrow (`BackLink`). */
  back?: ReactNode;
  actions?: ReactNode;
  width?: keyof typeof WIDTH;
  children: ReactNode;
};

/** Every page's frame: nav toggle, accent mark and title, actions, then the content rising in. */
export function PageLayout({ title, back, actions, width = "full", children }: Props) {
  const { toggleNav } = useShell();
  return (
    <main className={`mx-auto w-full px-4 pb-16 sm:px-6 ${WIDTH[width]}`}>
      <div className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-2 py-2">
        <Tooltip>
          <Button isIconOnly size="sm" variant="ghost" aria-label={m.menu} onPress={toggleNav}>
            <PanelLeft aria-hidden size={20} className="text-muted" />
          </Button>
          <Tooltip.Content placement="bottom">{m.menu}</Tooltip.Content>
        </Tooltip>
        {back}
        <span aria-hidden className="h-6 w-1 rounded-full bg-accent" />
        <h1 className="min-w-0 flex-1 truncate text-2xl font-semibold tracking-tight">{title}</h1>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <div className="grid animate-tt-rise gap-6 pt-4">{children}</div>
    </main>
  );
}
