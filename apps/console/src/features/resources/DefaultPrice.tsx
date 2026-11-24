import { Form } from "@heroui/react";
import type { Resource } from "@turftap/contract/client";
import { formatMoney, lkr, rupeesOf } from "@turftap/ui";
import { CircleCheck } from "lucide-react";
import { type FormEvent, useState } from "react";

import { LoadingButton } from "../../components/LoadingButton";
import { PriceField } from "../../components/PriceField";
import m from "../../i18n/en/prices";
import { useChangeResource } from "./useChangeResources";
import { useResource } from "./useResource";

/** VEN-05: the price of every slot no Price Rule covers. Staff who can't change it just read it. */
export function DefaultPrice({
  resourceId,
  canChange,
}: {
  resourceId: number;
  canChange: boolean;
}) {
  const { data: resource } = useResource(resourceId);
  if (!resource) return null;
  if (canChange) return <DefaultPriceForm resource={resource} />;
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-[var(--tt-line)] px-4 py-3">
      <span className="text-muted">{m.defaultPriceTitle}</span>
      <span className="text-xl font-semibold tabular-nums">{formatMoney(resource.price)}</span>
    </div>
  );
}

function DefaultPriceForm({ resource }: { resource: Resource }) {
  const changeResource = useChangeResource(resource.id);
  const [rupees, setRupees] = useState(String(rupeesOf(resource.price)));

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    changeResource.mutate({ path: { id: resource.id }, body: { price: lkr(Number(rupees)) } });
  };

  return (
    <Form
      className="flex flex-wrap items-start gap-3 border-b border-[var(--tt-line)] p-4"
      onSubmit={submit}
    >
      <div className="w-56">
        <PriceField label={m.defaultPriceLabel} value={rupees} onChange={setRupees} />
      </div>
      <LoadingButton
        type="submit"
        variant="secondary"
        isPending={changeResource.isPending}
        className="mt-6.5"
      >
        {m.saveDefaultPrice}
      </LoadingButton>
      {changeResource.isSuccess && (
        <p role="status" className="mt-8.5 inline-flex animate-tt-pop items-center gap-1.5 text-sm">
          <CircleCheck aria-hidden size={16} className="tt-tone-good tt-tone-text" />
          {m.saved}
        </p>
      )}
    </Form>
  );
}
