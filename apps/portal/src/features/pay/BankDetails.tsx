import { type Money, phoneShown } from "@turftap/contract";
import type { BankAccount } from "@turftap/contract/client";
import { formatMoney, rupeesOf } from "@turftap/ui";
import { Phone } from "lucide-react";

import m from "../../i18n/en/booking";
import { CopyRow } from "./CopyRow";

type Props = { amount: Money; bankAccount: BankAccount | null; venuePhone: string };

/** PAY-01: how much, then where to, drawn as a bank card. Every line copies with one tap. */
export function BankDetails({ amount, bankAccount, venuePhone }: Props) {
  if (!bankAccount) {
    return (
      <p className="tt-tone-watch flex items-start gap-2 text-sm text-pretty">
        <Phone size={16} aria-hidden className="tt-tone-text mt-0.5 shrink-0" />
        {m.pay.noBankAccount(phoneShown(venuePhone))}
      </p>
    );
  }
  return (
    <div className="tt-hue-money grid gap-3">
      <CopyRow
        label={m.pay.amount}
        value={formatMoney(amount)}
        copyText={String(rupeesOf(amount))}
        className="bg-[color-mix(in_oklab,var(--tt-hue)_8%,var(--tt-panel))] !px-4 !py-3"
        valueClassName="text-2xl tracking-tight text-[color-mix(in_oklab,var(--tt-hue)_80%,black)]"
      />
      <div className="tt-bank-card grid animate-tt-card-in gap-1 p-2.5 [animation-delay:200ms]">
        <div className="grid gap-1 sm:grid-cols-[minmax(0,1fr)_auto]">
          <CopyRow onCard label={m.pay.bank} value={bankAccount.bankName} />
          {bankAccount.branch && <CopyRow onCard label={m.pay.branch} value={bankAccount.branch} />}
        </div>
        <CopyRow
          onCard
          label={m.pay.accountNumber}
          value={bankAccount.accountNumber}
          copyText={bankAccount.accountNumber.replace(/[\s-]/g, "")}
          valueClassName="text-2xl tracking-[0.08em]"
          className="py-3"
        />
        <CopyRow onCard label={m.pay.accountName} value={bankAccount.accountName} />
      </div>
    </div>
  );
}
