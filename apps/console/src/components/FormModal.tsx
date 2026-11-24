import { Modal } from "@heroui/react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import type { Hue } from "./look";
import { TopicTile } from "./TopicTile";

type Props = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  hue: Hue;
  icon: LucideIcon;
  title: string;
  size?: "sm" | "md" | "lg";
  children: ReactNode;
};

/** A form in a window over the page, headed by its kind's tile; the page behind stays in place. */
export function FormModal({
  isOpen,
  onOpenChange,
  hue,
  icon,
  title,
  size = "md",
  children,
}: Props) {
  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Container size={size} scroll="outside">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header className="flex-row items-center gap-3">
            <TopicTile hue={hue} icon={icon} size={36} className="rounded-xl" />
            <Modal.Heading className="text-lg font-semibold">{title}</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="pt-2">{children}</Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
