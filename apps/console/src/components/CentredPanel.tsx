import type { ReactNode } from "react";

import m from "../i18n/en/shell";
import { BrandMark } from "@turftap/ui";

/** Pages outside the shell (sign in, choose a tenant): the brand, then one small panel. */
export function CentredPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <div className="grid w-full max-w-sm animate-tt-rise gap-6">
        <div className="flex items-center justify-center gap-2.5">
          <BrandMark size={36} />
          <span className="text-xl font-semibold tracking-tight">{m.brand}</span>
        </div>
        <section className="grid gap-5 tt-panel p-6">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {children}
        </section>
      </div>
    </main>
  );
}
