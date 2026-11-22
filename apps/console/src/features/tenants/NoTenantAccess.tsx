import { Button } from "@heroui/react";

import { useSignOut } from "../../lib/auth/useSignOut";
import shell from "../../i18n/en/shell";
import m from "../../i18n/en/tenants";

export function NoTenantAccess() {
  const signOut = useSignOut();

  return (
    <section className="grid gap-4">
      <h1 className="text-2xl font-semibold">{m.noAccessTitle}</h1>
      <p className="text-muted">{m.noAccessHint}</p>
      <Button variant="secondary" onPress={signOut}>
        {shell.signOut}
      </Button>
    </section>
  );
}
