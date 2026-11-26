import type { Money } from "@turftap/contract";
import { formatMoney } from "@turftap/ui";
import { Store, Wallet } from "lucide-react";

import m from "../../i18n/en/booking";

type Props = { price: Money; due: Money; advancePercent: number };

/** BKG-02: the price as one bar, split into what is paid now and what at the venue. */
export function PriceLines({ price, due, advancePercent }: Props) {
  const atVenue = { amount: price.amount - due.amount, currency: price.currency };
  const nowShare = price.amount ? (due.amount / price.amount) * 100 : 0;
  const percent = due.amount === price.amount ? 100 : advancePercent;
  return (
    <div className="grid gap-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-muted">{m.confirm.price}</span>
        <span className="animate-tt-fade text-2xl font-bold tracking-tight tabular-nums">
          {formatMoney(price)}
        </span>
      </div>

      <div
        role="img"
        aria-label={m.confirm.split(formatMoney(due), formatMoney(atVenue))}
        className="flex h-7 gap-1"
      >
        {due.amount > 0 && (
          <span
            className="tt-hue-money grid origin-left animate-tt-grow place-items-center rounded-full bg-[var(--tt-hue)] text-xs font-semibold text-white"
            style={{ width: `${nowShare}%` }}
          >
            {m.confirm.share(percent)}
          </span>
        )}
        {atVenue.amount > 0 && (
          <span
            className={`tt-tone-good grid flex-1 origin-right animate-tt-grow place-items-center rounded-full [animation-delay:120ms] ${due.amount ? "bg-[repeating-linear-gradient(135deg,var(--tt-field)_0_6px,color-mix(in_oklab,var(--tt-tone-off)_14%,var(--tt-field))_6px_12px)]" : "bg-[color-mix(in_oklab,var(--tt-tone)_18%,var(--tt-panel))] text-[var(--tt-tone)]"}`}
          >
            {!due.amount && <Store size={15} aria-hidden />}
          </span>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-3">
        <Part
          icon={<Wallet size={15} aria-hidden />}
          label={m.confirm.payNow}
          amount={formatMoney(due)}
          colour="tt-hue-money"
          strong={due.amount > 0}
        />
        <Part
          icon={<Store size={15} aria-hidden />}
          label={m.confirm.atVenueLater}
          amount={formatMoney(atVenue)}
          colour="[--tt-hue:var(--tt-tone-good)]"
          strong={due.amount === 0}
          end
        />
      </dl>
    </div>
  );
}

type PartProps = {
  icon: React.ReactNode;
  label: string;
  amount: string;
  colour: string;
  /** The part the customer acts on stands out; the other stays quiet. */
  strong: boolean;
  end?: boolean;
};

function Part({ icon, label, amount, colour, strong, end = false }: PartProps) {
  return (
    <div className={`${colour} grid gap-0.5 ${end ? "justify-items-end text-right" : ""}`}>
      <dt
        className={`flex items-center gap-1.5 text-xs font-medium ${strong ? "text-[var(--tt-hue)]" : "text-muted"}`}
      >
        {icon}
        {label}
      </dt>
      <dd
        className={`tabular-nums ${strong ? "text-xl font-bold tracking-tight" : "text-base font-medium text-muted"}`}
      >
        {amount}
      </dd>
    </div>
  );
}
