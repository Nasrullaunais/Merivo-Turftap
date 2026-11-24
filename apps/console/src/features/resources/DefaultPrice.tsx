import { Form } from "@heroui/react";
import type { Resource } from "@turftap/contract/client";
import { lkr, rupeesOf } from "@turftap/ui";
import { type FormEvent, useState } from "react";

import { LoadingButton } from "../../components/LoadingButton";
import { PriceField } from "../../components/PriceField";
import m from "../../i18n/en/prices";
import { useChangeResource } from "./useChangeResources";
import { useResource } from "./useResource";

export function DefaultPrice({ resourceId }: { resourceId: number }) {
  const { data: resource } = useResource(resourceId);
  return resource ? <DefaultPriceForm resource={resource} /> : null;
}

function DefaultPriceForm({ resource }: { resource: Resource }) {
  const changeResource = useChangeResource(resource.id);
  const [rupees, setRupees] = useState(String(rupeesOf(resource.price)));

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    changeResource.mutate({ path: { id: resource.id }, body: { price: lkr(Number(rupees)) } });
  };

  return (
    <Form className="grid gap-4" onSubmit={submit}>
      <h2 className="text-lg font-semibold">{m.defaultPriceTitle}</h2>
      <p className="text-muted">{m.defaultPriceHint}</p>
      <PriceField label={m.defaultPriceLabel} value={rupees} onChange={setRupees} />
      <LoadingButton type="submit" isPending={changeResource.isPending}>
        {m.saveDefaultPrice}
      </LoadingButton>
    </Form>
  );
}
