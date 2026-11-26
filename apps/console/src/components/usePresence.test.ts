import { act, renderHook } from "@testing-library/react";
import { useLayoutEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { usePresence } from "./usePresence";

type Item = { id: number; name: string };
const saman = { id: 1, name: "Saman" };
const nimali = { id: 2, name: "Nimali" };

function renderPresence(items: Item[]) {
  // What reached the screen: renders React threw away before drawing are not counted.
  const seen: string[][] = [];
  const hook = renderHook(
    ({ items }) => {
      const shown = usePresence(items, (item) => item.id);
      useLayoutEffect(() => {
        seen.push(shown.map((one) => `${one.item.name}${one.isLeaving ? " leaving" : ""}`));
      });
      return shown;
    },
    { initialProps: { items } },
  );
  return { ...hook, seen };
}

afterEach(() => vi.useRealTimers());

describe("usePresence", () => {
  it("removedItem_staysLeavingFromTheFirstRenderWithoutIt", () => {
    const { rerender, seen } = renderPresence([saman, nimali]);
    seen.length = 0;

    rerender({ items: [nimali] });

    expect(seen.every((names) => names.includes("Saman leaving"))).toBe(true);
  });

  it("removedItem_isGoneOnceItHasFaded", () => {
    vi.useFakeTimers();
    const { rerender, result } = renderPresence([saman, nimali]);
    rerender({ items: [nimali] });

    act(() => vi.runAllTimers());

    expect(result.current.map((one) => one.item.name)).toEqual(["Nimali"]);
  });

  it("removedItem_keepsItsPlaceWhileLeaving", () => {
    const { rerender, result } = renderPresence([saman, nimali]);
    rerender({ items: [nimali] });

    expect(result.current.map((one) => one.item.name)).toEqual(["Saman", "Nimali"]);
  });
});
