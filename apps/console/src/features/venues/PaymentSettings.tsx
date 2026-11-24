import { FieldError, Form, Input, Label, Switch, TextField } from "@heroui/react";
import { BankAccountInput, CreateVenue, FULL_AMOUNT_PERCENT } from "@turftap/contract";
import type { Venue } from "@turftap/contract/client";
import { CircleCheck, Landmark, Wallet } from "lucide-react";
import { type FormEvent, useState } from "react";

import { LoadingButton } from "../../components/LoadingButton";
import { ChoicePills } from "../../components/Pills";
import { Section } from "../../components/Section";
import m from "../../i18n/en/paymentSettings";
import { useChangeVenue } from "./useChangeVenue";
import { useVenue } from "./useVenue";

type Props = { venueId: number; canChange: boolean };

/** VEN-03: Owners change how customers pay; other staff see it so they can tell customers. */
export function PaymentSettings({ venueId, canChange }: Props) {
  const { data: venue } = useVenue(venueId);
  if (!venue) return null;
  return (
    <Section hue="money" icon={Wallet} title={m.title}>
      <div className="p-4">
        {canChange ? (
          <PaymentSettingsForm venue={venue} />
        ) : (
          <PaymentSettingsSummary venue={venue} />
        )}
      </div>
    </Section>
  );
}

function PaymentSettingsSummary({ venue }: { venue: Venue }) {
  const account = venue.bankAccount;
  if (venue.payAtVenue)
    return (
      <div className="grid gap-1">
        <p>{m.paysAtVenue}</p>
        <p className="text-muted">{m.cutOff(venue.cancellationCutOffHours)}</p>
      </div>
    );
  return (
    <div className="grid gap-1">
      <p>
        {account
          ? m.bankAccount(
              [account.bankName, account.branch, account.accountName, account.accountNumber].filter(
                (part): part is string => !!part,
              ),
            )
          : m.noBankAccount}
      </p>
      <p className="text-muted">
        {venue.advancePercent === FULL_AMOUNT_PERCENT
          ? m.paysFull
          : m.paysAdvance(venue.advancePercent)}
      </p>
      <p className="text-muted">{m.timeLimit(venue.paymentTimeLimitMinutes)}</p>
      <p className="text-muted">{m.cutOff(venue.cancellationCutOffHours)}</p>
      <p className="text-muted">{m.seriesDays(venue.seriesPaymentDaysBefore)}</p>
    </div>
  );
}

const fits =
  (
    field:
      | "advancePercent"
      | "paymentTimeLimitMinutes"
      | "cancellationCutOffHours"
      | "seriesPaymentDaysBefore",
  ) =>
  (value: string) =>
    /^\d+$/.test(value) && CreateVenue.shape[field].safeParse(Number(value)).success;
const isAccountNumber = (value: string) =>
  BankAccountInput.shape.accountNumber.safeParse(value).success;

type Amount = "FULL" | "ADVANCE";

function PaymentSettingsForm({ venue }: { venue: Venue }) {
  const changeVenue = useChangeVenue(venue.id);
  const account = venue.bankAccount;
  const [payAtVenue, setPayAtVenue] = useState(venue.payAtVenue);
  const [bankName, setBankName] = useState(account?.bankName ?? "");
  const [branch, setBranch] = useState(account?.branch ?? "");
  const [accountName, setAccountName] = useState(account?.accountName ?? "");
  const [accountNumber, setAccountNumber] = useState(account?.accountNumber ?? "");
  const [amount, setAmount] = useState<Amount>(
    venue.advancePercent === FULL_AMOUNT_PERCENT ? "FULL" : "ADVANCE",
  );
  const [advancePercent, setAdvancePercent] = useState(
    venue.advancePercent === FULL_AMOUNT_PERCENT ? "" : String(venue.advancePercent),
  );
  const [timeLimit, setTimeLimit] = useState(String(venue.paymentTimeLimitMinutes));
  const [cutOff, setCutOff] = useState(String(venue.cancellationCutOffHours));
  const [seriesDays, setSeriesDays] = useState(String(venue.seriesPaymentDaysBefore));

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cancellationCutOffHours = Number(cutOff);
    // At Pay at Venue the online-payment fields are hidden; their saved values stay untouched.
    const body = payAtVenue
      ? { payAtVenue, cancellationCutOffHours }
      : {
          payAtVenue,
          bankAccount: { bankName, branch: branch.trim() || null, accountName, accountNumber },
          advancePercent: amount === "FULL" ? FULL_AMOUNT_PERCENT : Number(advancePercent),
          paymentTimeLimitMinutes: Number(timeLimit),
          cancellationCutOffHours,
          seriesPaymentDaysBefore: Number(seriesDays),
        };
    changeVenue.mutate({ path: { id: venue.id }, body });
  };

  return (
    <Form className="grid gap-5" onSubmit={submit}>
      <Switch isSelected={payAtVenue} onChange={setPayAtVenue}>
        <Switch.Content>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          <Label>{m.payAtVenueLabel}</Label>
        </Switch.Content>
      </Switch>
      {payAtVenue ? (
        <p className="text-muted">{m.paysAtVenue}</p>
      ) : (
        <>
          <fieldset className="grid gap-3 sm:grid-cols-2">
            <legend className="mb-3 inline-flex items-center gap-2 font-medium">
              <Landmark aria-hidden size={16} className="text-muted" />
              {m.bankTitle}
            </legend>
            <TextField name="bankName" isRequired value={bankName} onChange={setBankName}>
              <Label>{m.bankNameLabel}</Label>
              <Input placeholder="Bank of Ceylon" />
              <FieldError />
            </TextField>
            <TextField name="branch" value={branch} onChange={setBranch}>
              <Label>{m.branchLabel}</Label>
              <Input />
            </TextField>
            <TextField name="accountName" isRequired value={accountName} onChange={setAccountName}>
              <Label>{m.accountNameLabel}</Label>
              <Input />
              <FieldError />
            </TextField>
            <TextField
              name="accountNumber"
              isRequired
              value={accountNumber}
              onChange={setAccountNumber}
              validate={(value) => (isAccountNumber(value) ? null : m.accountNumberInvalid)}
            >
              <Label>{m.accountNumberLabel}</Label>
              <Input inputMode="numeric" className="tabular-nums" />
              <FieldError />
            </TextField>
          </fieldset>
          <ChoicePills
            name="amount"
            label={m.amountLabel}
            value={amount}
            onChange={setAmount}
            choices={[
              { value: "FULL", label: m.fullAmount },
              { value: "ADVANCE", label: m.advance },
            ]}
          />
          {amount === "ADVANCE" && (
            <TextField
              name="advancePercent"
              type="number"
              isRequired
              value={advancePercent}
              onChange={setAdvancePercent}
              validate={(value) =>
                fits("advancePercent")(value) && Number(value) < FULL_AMOUNT_PERCENT
                  ? null
                  : m.advancePercentInvalid
              }
            >
              <Label>{m.advancePercentLabel}</Label>
              <Input min={1} max={FULL_AMOUNT_PERCENT - 1} step={1} className="sm:w-40" />
              <FieldError />
            </TextField>
          )}
        </>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {!payAtVenue && (
          <TextField
            name="paymentTimeLimitMinutes"
            type="number"
            isRequired
            value={timeLimit}
            onChange={setTimeLimit}
            validate={(value) =>
              fits("paymentTimeLimitMinutes")(value) ? null : m.timeLimitInvalid
            }
          >
            <Label>{m.timeLimitLabel}</Label>
            <Input step={1} />
            <FieldError />
          </TextField>
        )}
        <TextField
          name="cancellationCutOffHours"
          type="number"
          isRequired
          value={cutOff}
          onChange={setCutOff}
          validate={(value) => (fits("cancellationCutOffHours")(value) ? null : m.cutOffInvalid)}
        >
          <Label>{m.cutOffLabel}</Label>
          <Input step={1} />
          <FieldError />
        </TextField>
        {!payAtVenue && (
          <TextField
            name="seriesPaymentDaysBefore"
            type="number"
            isRequired
            value={seriesDays}
            onChange={setSeriesDays}
            validate={(value) =>
              fits("seriesPaymentDaysBefore")(value) ? null : m.seriesDaysInvalid
            }
          >
            <Label>{m.seriesDaysLabel}</Label>
            <Input step={1} />
            <FieldError />
          </TextField>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-[var(--tt-line)] pt-4">
        <LoadingButton type="submit" isPending={changeVenue.isPending}>
          {m.save}
        </LoadingButton>
        {changeVenue.isSuccess && (
          <p role="status" className="inline-flex animate-tt-pop items-center gap-1.5 text-sm">
            <CircleCheck aria-hidden size={16} className="tt-tone-good tt-tone-text" />
            {m.saved}
          </p>
        )}
      </div>
    </Form>
  );
}
