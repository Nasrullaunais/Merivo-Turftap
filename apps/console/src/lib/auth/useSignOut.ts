import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { signOut } from "./session";

export function useSignOut() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return () => {
    signOut();
    queryClient.clear();
    void navigate({ to: "/sign-in" });
  };
}
