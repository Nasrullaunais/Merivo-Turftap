import { createFileRoute } from "@tanstack/react-router";

import { SignInSteps } from "../features/sign-in/SignInSteps";

type SignInSearch = { back?: string };

// Only a page of this portal: "//x" and "/\x" would leave the site.
const OWN_PAGE = /^\/(?![/\\])/;

export const Route = createFileRoute("/sign-in")({
  // The router keeps keys left out of the reply, so a refused address is set to undefined.
  validateSearch: (search): SignInSearch => ({
    back: typeof search.back === "string" && OWN_PAGE.test(search.back) ? search.back : undefined,
  }),
  component: SignInPage,
});

function SignInPage() {
  const { back } = Route.useSearch();
  const navigate = Route.useNavigate();
  return <SignInSteps onDone={() => void navigate({ href: back ?? "/", replace: true })} />;
}
