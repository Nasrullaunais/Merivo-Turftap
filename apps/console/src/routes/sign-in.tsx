import { createFileRoute, redirect } from "@tanstack/react-router";

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
    <main className="mx-auto grid max-w-sm gap-4 p-6">
      <h1 className="text-2xl font-semibold">{m.title}</h1>
      <TestSignInForm />
    </main>
  );
}
