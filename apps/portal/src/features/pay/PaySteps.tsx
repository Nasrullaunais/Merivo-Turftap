import type { Booking } from "@turftap/contract/client";
import { formatMoney, onVenueClock } from "@turftap/ui";
import { CalendarClock, Landmark, type LucideIcon, ReceiptText, Store } from "lucide-react";
import type { ReactNode } from "react";

import { Journey } from "../../components/Journey";
import m from "../../i18n/en/booking";
import slots from "../../i18n/en/slots";
import { BankDetails } from "./BankDetails";
import { Countdown } from "./Countdown";
import { ReceiptPicker } from "./ReceiptPicker";
import { useSendReceipt } from "./useSendReceipt";

type Props = { booking: Booking; leftMs: number; venuePhone: string; timeZone: string };

/** PAY-01, PAY-02: how much and by when, where to send it, then the receipt: in that order. */
export function PaySteps({ booking, leftMs, venuePhone, timeZone }: Props) {
  const send = useSendReceipt(booking.id);
  const expiresAt = booking.expiresAt ?? booking.createdAt;
  const totalMs = Date.parse(expiresAt) - Date.parse(booking.createdAt);
  const atVenue = { ...booking.price, amount: booking.price.amount - booking.amountDue.amount };

  return (
    <div className="grid gap-6">
      <header className="flex animate-tt-rise items-center gap-4 [animation-delay:60ms]">
        <Countdown leftMs={leftMs} totalMs={totalMs} />
        <div className="grid gap-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            {m.pay.title(formatMoney(booking.amountDue))}
          </h1>
          <p className="tt-tone-watch tt-tone-text flex items-center gap-1.5 text-sm font-medium">
            <CalendarClock size={15} aria-hidden />
            {m.pay.by(
              slots.clock(expiresAt, timeZone),
              slots.shortDate(onVenueClock(expiresAt, timeZone).date),
            )}
          </p>
        </div>
      </header>

      <div className="animate-tt-rise [animation-delay:120ms]">
        <Journey online at={1} />
      </div>

      <Step icon={Landmark} title={m.pay.transferStep} delayMs={160}>
        <BankDetails
          amount={booking.amountDue}
          bankAccount={booking.bankAccount}
          venuePhone={venuePhone}
        />
        {atVenue.amount > 0 && (
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <Store size={14} aria-hidden />
            {m.pay.restAtVenue(formatMoney(atVenue))}
          </p>
        )}
      </Step>
      <Step icon={ReceiptText} title={m.pay.receiptStep} delayMs={220}>
        <ReceiptPicker sending={send.isPending} onSend={(file) => send.mutate(file)} />
      </Step>
    </div>
  );
}

type StepProps = { icon: LucideIcon; title: string; delayMs: number; children: ReactNode };

/** Each step wears the icon of its dot on the steps above, so the two read as one. */
function Step({ icon: Icon, title, delayMs, children }: StepProps) {
  return (
    <section
      className="tt-panel grid animate-tt-card-in gap-4 p-5"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <h2 className="tt-hue-money flex items-center gap-3 font-semibold tracking-tight">
        <span className="tt-tile size-9 rounded-full" data-on="true">
          <Icon size={17} aria-hidden />
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}
