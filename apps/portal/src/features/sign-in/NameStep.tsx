import { Button, FieldError, Form, Input, Label, Spinner, TextField } from "@heroui/react";
import { CustomerName, phoneShown } from "@turftap/contract";
import { ArrowRight, Smartphone, UserRound } from "lucide-react";
import type { FormEvent } from "react";

import m from "../../i18n/en/signIn";
import { signOut } from "../../lib/auth/session";
import { StepCard } from "./StepCard";
import { useSaveMyName } from "./useSaveMyName";

const NAME_FIELD = "name";

type Props = {
  phone: string;
  /** Already known from elsewhere, such as staff work at another venue: offered, not forced. */
  knownName: string | null;
};

/** POR-03: asked once per tenant, the first time this phone signs in here. */
export function NameStep({ phone, knownName }: Props) {
  const save = useSaveMyName();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = CustomerName.safeParse(new FormData(event.currentTarget).get(NAME_FIELD));
    if (name.success) save.mutate({ body: { phone, name: name.data } });
  };

  return (
    <StepCard icon={UserRound} hue="tt-hue-people" title={m.name.title} body={m.name.body}>
      <Form className="grid gap-4" onSubmit={submit}>
        <TextField
          name={NAME_FIELD}
          isRequired
          defaultValue={knownName ?? ""}
          validate={(value) => (CustomerName.safeParse(value).success ? null : m.name.invalid)}
        >
          <Label>{m.name.label}</Label>
          <Input autoFocus autoComplete="name" className="h-12 text-lg" />
          <FieldError />
        </TextField>
        <Button type="submit" fullWidth size="lg" isPending={save.isPending} className="group">
          {save.isPending ? <Spinner color="current" size="sm" /> : m.name.submit}
          {!save.isPending && (
            <ArrowRight
              size={18}
              aria-hidden
              className="transition-transform group-hover:translate-x-0.5"
            />
          )}
        </Button>
      </Form>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--tt-line)] pt-4 text-sm">
        <span className="inline-flex items-center gap-1.5 text-muted tabular-nums">
          <Smartphone size={15} aria-hidden />
          {phoneShown(phone)}
        </span>
        <button
          type="button"
          onClick={signOut}
          className="tt-t1 -mr-2 rounded-full px-3 py-1.5 font-medium text-accent hover:bg-[var(--tt-hover)] active:scale-[0.97]"
        >
          {m.name.otherNumber}
        </button>
      </div>
    </StepCard>
  );
}
