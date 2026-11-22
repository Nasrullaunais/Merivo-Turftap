import {
  Button,
  FieldError,
  Form,
  Input,
  Label,
  Radio,
  RadioGroup,
  TextField,
} from "@heroui/react";
import { BankAccountInput, CreateVenue, FULL_AMOUNT_PERCENT } from "@turftap/contract";
import type { Venue } from "@turftap/contract/client";
import { type FormEvent, useState } from "react";

import m from "../../i18n/en/paymentSettings";
import { useChangeVenue } from "./useChangeVenue";
import { useVenue } from "./useVenue";

type Props = { venueId: number; canChange: boolean };

/** VEN-03: Owners change how customers pay; other staff see it so they can tell customers. */
export function PaymentSettings({ venueId, canChange }: Props) {
  const { data: venue } = useVenue(venueId);
  if (!venue) return null;
  return (
    <section className="grid gap-3">
      <h2 className="text-lg font-semibold">{m.title}</h2>
      {canChange ? <PaymentSettingsForm venue={venue} /> : <PaymentSettingsSummary venue={venue} />}
    </section>
  );
}

function PaymentSettingsSummary({ venue }: { venue: Venue }) {
  const account = venue.bankAccount;
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
    </div>
  );
}

const fits =
  (field: "advancePercent" | "paymentTimeLimitMinutes" | "cancellationCutOffHours") =>
  (value: string) =>
    /^\d+$/.test(value) && CreateVenue.shape[field].safeParse(Number(value)).success;
const isAccountNumber = (value: string) =>
  BankAccountInput.shape.accountNumber.safeParse(value).success;

type Amount = "FULL" | "ADVANCE";

function PaymentSettingsForm({ venue }: { venue: Venue }) {
  const changeVenue = useChangeVenue(venue.id);
  const account = venue.bankAccount;
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

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    changeVenue.mutate({
      path: { id: venue.id },
      body: {
        bankAccount: { bankName, branch: branch.trim() || null, accountName, accountNumber },
        advancePercent: amount === "FULL" ? FULL_AMOUNT_PERCENT : Number(advancePercent),
        paymentTimeLimitMinutes: Number(timeLimit),
        cancellationCutOffHours: Number(cutOff),
      },
    });
  };

  return (
    <Form className="grid gap-4" onSubmit={submit}>
      <h3 className="font-medium">{m.bankTitle}</h3>
      <div className="grid grid-cols-2 gap-3">
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
          <Input inputMode="numeric" />
          <FieldError />
        </TextField>
      </div>
      <RadioGroup
        name="amount"
        orientation="horizontal"
        value={amount}
        onChange={(value) => setAmount(value as Amount)}
      >
        <Label>{m.amountLabel}</Label>
        {(["FULL", "ADVANCE"] as const).map((value) => (
          <Radio key={value} value={value}>
            <Radio.Control>
              <Radio.Indicator />
            </Radio.Control>
            <Radio.Content>
              <Label>{value === "FULL" ? m.fullAmount : m.advance}</Label>
            </Radio.Content>
          </Radio>
        ))}
      </RadioGroup>
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
          <Input min={1} max={FULL_AMOUNT_PERCENT - 1} step={1} />
          <FieldError />
        </TextField>
      )}
      <div className="grid grid-cols-2 gap-3">
        <TextField
          name="paymentTimeLimitMinutes"
          type="number"
          isRequired
          value={timeLimit}
          onChange={setTimeLimit}
          validate={(value) => (fits("paymentTimeLimitMinutes")(value) ? null : m.timeLimitInvalid)}
        >
          <Label>{m.timeLimitLabel}</Label>
          <Input step={1} />
          <FieldError />
        </TextField>
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
      </div>
      <Button type="submit" isPending={changeVenue.isPending}>
        {m.save}
      </Button>
      {changeVenue.isSuccess && <p role="status">{m.saved}</p>}
    </Form>
  );
}
