import { useEffect, useRef, useState } from "react";

type Key = string | number;
const LEAVE_MS = 260;

export type Present<T> = { item: T; key: Key; isNew: boolean; isLeaving: boolean };
type Leaving<T> = Map<Key, { item: T; index: number }>;

const sameKeys = <T>(a: T[], b: T[], keyOf: (item: T) => Key) =>
  a.length === b.length && a.every((item, index) => keyOf(item) === keyOf(b[index]!));

/**
 * A list's items plus any just removed, kept in their old place for a moment so they can
 * fade out (`tt-leaving`). Items added after the first render are `isNew` and land.
 */
export function usePresence<T>(items: T[], keyOf: (item: T) => Key): Present<T>[] {
  const [first] = useState(() => new Set(items.map(keyOf)));
  const [previous, setPrevious] = useState(items);
  const [leaving, setLeaving] = useState<Leaving<T>>(() => new Map());
  const timers = useRef(new Map<Key, ReturnType<typeof setTimeout>>());

  // Worked out during render, not in an effect, so a removed item is never missing for a frame.
  if (!sameKeys(items, previous, keyOf)) {
    const now = new Set(items.map(keyOf));
    const gone = previous
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => !now.has(keyOf(item)));
    setPrevious(items);
    if (gone.length > 0) {
      setLeaving((map) => new Map([...map, ...gone.map((one) => [keyOf(one.item), one] as const)]));
    }
  }

  useEffect(() => {
    for (const key of leaving.keys()) {
      if (timers.current.has(key)) continue;
      const timer = setTimeout(() => {
        timers.current.delete(key);
        setLeaving((map) => {
          const next = new Map(map);
          next.delete(key);
          return next;
        });
      }, LEAVE_MS);
      timers.current.set(key, timer);
    }
  }, [leaving]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
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
