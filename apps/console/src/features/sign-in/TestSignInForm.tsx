import { Button, FieldError, Form, Input, Label, TextField } from "@heroui/react";
import { PhoneInput } from "@turftap/contract";
import { FlaskConical } from "lucide-react";
import type { FormEvent } from "react";

import m from "../../i18n/en/signIn";
import { useTestSignIn } from "./useTestSignIn";

const PHONE_FIELD = "phone";

export function TestSignInForm() {
  const signIn = useTestSignIn();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const typed = new FormData(event.currentTarget).get(PHONE_FIELD);
    const phone = PhoneInput.safeParse(typed);
    if (phone.success) signIn(phone.data);
  };

  return (
    <Form className="grid gap-4" onSubmit={submit}>
      <p className="flex gap-2 rounded-lg bg-[color-mix(in_oklab,var(--tt-tone)_12%,transparent)] p-3 text-sm tt-tone-watch tt-tone-text">
        <FlaskConical aria-hidden size={16} className="mt-0.5 shrink-0" />
        {m.testOnly}
      </p>
      <TextField
        name={PHONE_FIELD}
        type="tel"
        isRequired
        validate={(value) => (PhoneInput.safeParse(value).success ? null : m.phoneInvalid)}
      >
        <Label>{m.phoneLabel}</Label>
        <Input placeholder="077 123 4567" />
        <FieldError />
      </TextField>
      <Button type="submit" fullWidth>
        {m.submit}
      </Button>
    </Form>
  );
}
