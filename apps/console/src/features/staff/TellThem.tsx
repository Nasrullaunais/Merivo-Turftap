import { Button, buttonVariants } from "@heroui/react";
import type { StaffRole } from "@turftap/contract";
import { Check, CircleCheck, Copy, Send, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";

import m from "../../i18n/en/staff";
import tenants from "../../i18n/en/tenants";

const COPIED_SHOWN_MS = 2000;

type Props = {
  person: { phone: string; role: StaffRole };
  tenantName: string;
  onAddAnother: () => void;
};

/** SIG-03 (D-51): the Owner sends the sign-in link from their own WhatsApp, not TurfTap's number. */
export function TellThem({ person, tenantName, onAddAnother }: Props) {
  const role = tenants.roles[person.role];
  const message = m.signInMessage(tenantName, role, window.location.origin);
  const whatsAppLink = `https://wa.me/${person.phone.slice("+".length)}?text=${encodeURIComponent(message)}`;
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_SHOWN_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    await navigator.clipboard.writeText(message);
    setCopied(true);
  };

  return (
    <div className="grid animate-tt-rise gap-4">
      <p role="status" className="inline-flex items-center gap-2 font-medium">
        <CircleCheck aria-hidden size={18} className="animate-tt-pop tt-tone-good tt-tone-text" />
        {m.added(person.phone, role)}
      </p>
      <figure className="grid gap-2">
        <figcaption className="text-sm text-muted">{m.tellThem}</figcaption>
        <blockquote className="rounded-2xl rounded-tl-sm bg-[var(--tt-field)] px-4 py-3 text-sm leading-relaxed">
          {message}
        </blockquote>
      </figure>
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={whatsAppLink}
          target="_blank"
          rel="noreferrer"
          className={buttonVariants({ variant: "primary" })}
        >
          <Send aria-hidden size={16} />
          {m.sendOnWhatsApp}
        </a>
        <Button variant="secondary" onPress={copy}>
          {copied ? (
            <Check aria-hidden size={16} className="animate-tt-pop tt-tone-good tt-tone-text" />
          ) : (
            <Copy aria-hidden size={16} />
          )}
          <span className="grid">
            <span
              aria-hidden={copied}
              className={`col-start-1 row-start-1 tt-t1 ${copied ? "opacity-0" : ""}`}
            >
              {m.copyMessage}
            </span>
            <span
              aria-hidden={!copied}
              className={`col-start-1 row-start-1 tt-t1 ${copied ? "" : "opacity-0"}`}
            >
              {m.copied}
            </span>
          </span>
        </Button>
        <Button variant="ghost" onPress={onAddAnother}>
          <UserPlus aria-hidden size={16} />
          {m.addAnother}
        </Button>
      </div>
    </div>
  );
}
