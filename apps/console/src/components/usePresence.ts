import { useEffect, useRef, useState } from "react";

type Key = string | number;
const LEAVE_MS = 260;

export type Present<T> = { item: T; key: Key; isNew: boolean; isLeaving: boolean };

/**
 * A list's items plus any just removed, kept in their old place for a moment so they can
 * fade out (`tt-leaving`). Items added after the first render are `isNew` and land.
 */
export function usePresence<T>(items: T[], keyOf: (item: T) => Key): Present<T>[] {
  const [first] = useState(() => new Set(items.map(keyOf)));
  const [leaving, setLeaving] = useState<Map<Key, { item: T; index: number }>>(() => new Map());
  const previous = useRef(items);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  // keyOf is usually a fresh arrow each render; only a change of items should run the effect.
  const keyRef = useRef(keyOf);
  useEffect(() => {
    keyRef.current = keyOf;
  });

  useEffect(() => {
    const keyOf = keyRef.current;
    const now = new Set(items.map(keyOf));
    const gone = previous.current
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => !now.has(keyOf(item)));
    previous.current = items;
    if (gone.length === 0) return;
    const change = (apply: (map: Map<Key, { item: T; index: number }>) => void) =>
      setLeaving((map) => {
        const next = new Map(map);
        apply(next);
        return next;
      });
    change((map) => gone.forEach((one) => map.set(keyOf(one.item), one)));
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      change((map) => gone.forEach((one) => map.delete(keyOf(one.item))));
    }, LEAVE_MS);
    timers.current.add(timer);
  }, [items]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const shown: Present<T>[] = items.map((item) => ({
    item,
    key: keyOf(item),
    isNew: !first.has(keyOf(item)),
    isLeaving: false,
  }));
  for (const [key, { item, index }] of leaving) {
    if (shown.some((one) => one.key === key)) continue;
    shown.splice(Math.min(index, shown.length), 0, { item, key, isNew: false, isLeaving: true });
  }
  return shown;
}
