import { useNavigate } from "@tanstack/react-router";

import { signInForTesting } from "../../lib/auth/session";

export function useTestSignIn() {
  const navigate = useNavigate();
  return (phone: string) => {
    signInForTesting(phone);
    void navigate({ to: "/" });
  };
}
