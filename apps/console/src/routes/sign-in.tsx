import { createFileRoute, redirect } from "@tanstack/react-router";

import { CentredPanel } from "../components/CentredPanel";
import { TestSignInForm } from "../features/sign-in/TestSignInForm";
import { isSignedIn } from "../lib/auth/session";
import m from "../i18n/en/signIn";

export const Route = createFileRoute("/sign-in")({
  beforeLoad: () => {
    if (isSignedIn()) throw redirect({ to: "/" });
  },
  component: SignInPage,
});

function SignInPage() {
  return (
    <CentredPanel title={m.title}>
      <TestSignInForm />
    </CentredPanel>
  );
}
