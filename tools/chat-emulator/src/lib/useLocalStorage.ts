import { useCallback, useState } from "react";

const PREFIX = "turftap-chat-emulator:";

export function useLocalStorage<T>(key: string, initial: T) {
  const storageKey = PREFIX + key;
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw === null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  });

  const set = useCallback(
    (next: T) => {
      setValue(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* ignore quota / privacy-mode errors */
      }
    },
    [storageKey],
  );

  return [value, set] as const;
}
