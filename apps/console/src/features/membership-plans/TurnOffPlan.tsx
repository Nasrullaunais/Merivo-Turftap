import { AlertDialog, Button } from "@heroui/react";
import type { MembershipPlan } from "@turftap/contract/client";
import { Power } from "lucide-react";

import { IconAction } from "../../components/IconAction";
import m from "../../i18n/en/membershipPlans";
import { useTurnOffMembershipPlan } from "./useChangeMembershipPlans";

export function TurnOffPlan({ plan }: { plan: MembershipPlan }) {
  const turnOff = useTurnOffMembershipPlan();

  return (
    <AlertDialog>
      <IconAction
        danger
        icon={Power}
        label={m.turnOffFor(plan.name)}
        hint={m.turnOff}
        isPending={turnOff.isPending}
      />
      <AlertDialog.Backdrop>
        <AlertDialog.Container>
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>{m.turnOffTitle(plan.name)}</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>{m.turnOffHint}</AlertDialog.Body>
            <AlertDialog.Footer>
              <Button slot="close" variant="tertiary">
                {m.keep}
              </Button>
              <Button
                slot="close"
                variant="danger"
                onPress={() => turnOff.mutate({ path: { id: plan.id } })}
              >
                {m.turnOff}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}
