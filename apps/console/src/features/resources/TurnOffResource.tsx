import { AlertDialog, Button } from "@heroui/react";
import type { Resource } from "@turftap/contract/client";
import { Power } from "lucide-react";

import { IconAction } from "../../components/IconAction";
import m from "../../i18n/en/resources";
import { useTurnOffResource } from "./useChangeResources";

export function TurnOffResource({ resource }: { resource: Resource }) {
  const turnOff = useTurnOffResource();

  return (
    <AlertDialog>
      <IconAction
        danger
        icon={Power}
        label={m.turnOffFor(resource.name)}
        hint={m.turnOff}
        isPending={turnOff.isPending}
      />
      <AlertDialog.Backdrop>
        <AlertDialog.Container>
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>{m.turnOffTitle(resource.name)}</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>{m.turnOffHint}</AlertDialog.Body>
            <AlertDialog.Footer>
              <Button slot="close" variant="tertiary">
                {m.keep}
              </Button>
              <Button
                slot="close"
                variant="danger"
                onPress={() => turnOff.mutate({ path: { id: resource.id } })}
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
