import { Button } from "@heroui/react";
import { LogOut } from "lucide-react";

import { useSignOut } from "../../lib/auth/useSignOut";
import shell from "../../i18n/en/shell";
import m from "../../i18n/en/tenants";

export function NoTenantAccess() {
  const signOut = useSignOut();

  return (
    <>
      <p className="text-muted">{m.noAccessHint}</p>
      <Button variant="secondary" onPress={signOut} className="justify-self-start">
        <LogOut aria-hidden size={16} />
        {shell.signOut}
      </Button>
    </>
  );
}
