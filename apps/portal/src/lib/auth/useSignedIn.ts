import { useSyncExternalStore } from "react";

import { isSignedIn, onSessionChange } from "./session";

export function useSignedIn() {
  return useSyncExternalStore(onSessionChange, isSignedIn);
}
