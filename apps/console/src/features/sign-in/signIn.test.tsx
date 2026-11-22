import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { signInForTesting } from "../../lib/auth/session";
import { apiError, mockApi } from "../../test/mockApi";
import { renderApp } from "../../test/renderApp";
import { myTenant } from "../../test/tenants";

const demoSports = myTenant({ id: 1, slug: "demo", name: "Demo Sports", role: "OWNER" });
const owner = {
  id: 1,
  phone: "+94771234567",
  name: "Demo Owner",
  isPlatformAdmin: false,
  tenants: [demoSports],
};

const signInHeading = () => screen.findByRole("heading", { name: "Sign in" });

function typePhoneAndSubmit(phone: string) {
  fireEvent.change(screen.getByLabelText(/Phone number/), { target: { value: phone } });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("SIG-01 sign in to the Staff Console", () => {
  it("signIn_isAskedForBeforeAnythingElse", async () => {
    const fetch = mockApi({ "GET /v1/me": owner });
    renderApp("/");
    expect(await signInHeading()).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("signIn_sendsTheTypedNumberInOneFormat", async () => {
    const fetch = mockApi({ "GET /v1/me": owner });
    renderApp("/sign-in");
    await signInHeading();
    typePhoneAndSubmit("077 123 4567");
    expect(await screen.findByText(/Demo Sports/)).toBeInTheDocument();
    const request = fetch.mock.calls[0]![0] as Request;
    expect(request.headers.get("Authorization")).toBe("Bearer fake:+94771234567");
  });

  it("signIn_refusesSomethingThatIsNotAPhoneNumber", async () => {
    const fetch = mockApi({ "GET /v1/me": owner });
    renderApp("/sign-in");
    await signInHeading();
    typePhoneAndSubmit("hello");
    expect(await screen.findByText("Enter a phone number like 077 123 4567")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("signIn_isAskedAgainWhenTheApiRefusesTheSignIn", async () => {
    signInForTesting("+94771234567");
    mockApi({
      "GET /v1/me": () => apiError(401, "tt_htt_401", "Your sign-in is invalid or has expired"),
    });
    const { router } = renderApp("/");
    expect(await signInHeading()).toBeInTheDocument();
    await router.navigate({ to: "/" });
    expect(await signInHeading()).toBeInTheDocument();
  });

  it("signOut_returnsToSignInAndForgetsTheUser", async () => {
    signInForTesting("+94771234567");
    const fetch = mockApi({ "GET /v1/me": owner });
    const { router } = renderApp("/");
    fireEvent.click(await screen.findByRole("button", { name: "Sign out" }));
    expect(await signInHeading()).toBeInTheDocument();
    await router.navigate({ to: "/" });
    expect(await signInHeading()).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
