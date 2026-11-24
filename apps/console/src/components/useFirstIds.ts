import { useState } from "react";

/** The ids a list had when it first showed; any id added later is new and lands. */
export function useFirstIds(ids: number[]) {
  const [first] = useState(() => new Set(ids));
  return (id: number) => !first.has(id);
}
