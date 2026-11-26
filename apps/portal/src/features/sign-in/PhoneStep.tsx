import { Button, FieldError, Form, Input, Label, TextField } from "@heroui/react";
import { PhoneInput } from "@turftap/contract";
import { ArrowRight, FlaskConical, Smartphone } from "lucide-react";
import type { FormEvent } from "react";

import m from "../../i18n/en/signIn";
import { signInForTesting } from "../../lib/auth/session";
import { StepCard } from "./StepCard";

const PHONE_FIELD = "phone";

/** Until Auth0 is connected (T42) this is the test sign-in: no code, just the number. */
export function PhoneStep() {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const phone = PhoneInput.safeParse(new FormData(event.currentTarget).get(PHONE_FIELD));
    if (phone.success) signInForTesting(phone.data);
  };

  return (
    <StepCard icon={Smartphone} hue="tt-hue-booking" title={m.phone.title} body={m.phone.body}>
      <Form className="grid gap-4" onSubmit={submit}>
        <TextField
          name={PHONE_FIELD}
          type="tel"
          isRequired
          validate={(value) => (PhoneInput.safeParse(value).success ? null : m.phone.invalid)}
        >
          <Label>{m.phone.label}</Label>
          <Input
            autoFocus
            autoComplete="tel"
            placeholder="077 123 4567"
            className="h-12 text-lg tabular-nums"
          />
          <FieldError />
        </TextField>
        <Button type="submit" fullWidth size="lg" className="group">
          {m.phone.submit}
          <ArrowRight
            size={18}
            aria-hidden
            className="transition-transform group-hover:translate-x-0.5"
          />
        </Button>
        <p className="flex gap-2 rounded-lg bg-[color-mix(in_oklab,var(--tt-tone)_12%,transparent)] p-3 text-xs tt-tone-watch tt-tone-text">
          <FlaskConical aria-hidden size={14} className="mt-px shrink-0" />
          {m.phone.testOnly}
        </p>
      </Form>
    </StepCard>
  );
}
