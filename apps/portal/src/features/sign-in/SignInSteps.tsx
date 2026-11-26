import { Button, Spinner } from "@heroui/react";
import { CloudOff } from "lucide-react";
import { useEffect, useEffectEvent } from "react";

import m from "../../i18n/en/signIn";
import { useSignedIn } from "../../lib/auth/useSignedIn";
import { useMyCustomer } from "../../lib/customer/useMyCustomer";
import { NameStep } from "./NameStep";
import { PhoneStep } from "./PhoneStep";
import { StepCard } from "./StepCard";
import { useMe } from "./useMe";

/**
 * POR-03: phone first, then the name only if this tenant doesn't know the phone yet. Someone who
 * booked through the Assistant already has a record, so they go straight back.
 */
export function SignInSteps({ onDone }: { onDone: () => void }) {
  const signedIn = useSignedIn();
  const mine = useMyCustomer({ enabled: signedIn });
  const me = useMe({ enabled: signedIn });
  const done = signedIn && !!mine.data;
  const finish = useEffectEvent(onDone);

  useEffect(() => {
    if (done) finish();
  }, [done]);

  if (!signedIn) return <PhoneStep key="phone" />;
  if (mine.isError || me.isError) {
    const retry = () => void Promise.all([mine.refetch(), me.refetch()]);
    return (
      <StepCard icon={CloudOff} hue="tt-hue-plain" title={m.failed.title} body={m.failed.body}>
        <Button onPress={retry} isPending={mine.isFetching || me.isFetching}>
          {m.failed.retry}
        </Button>
      </StepCard>
    );
  }
  if (mine.data === null && me.data) {
    return <NameStep key="name" phone={me.data.phone} knownName={me.data.name} />;
  }
  return (
    <p
      role="status"
      className="mx-auto flex w-fit animate-tt-fade items-center gap-2 py-16 text-sm text-muted"
    >
      <Spinner size="sm" color="current" />
      {m.checking}
    </p>
  );
}
