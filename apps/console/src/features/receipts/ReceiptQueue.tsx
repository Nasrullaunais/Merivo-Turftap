import { Alert, Skeleton } from "@heroui/react";
import type { MyTenant, PaymentStatus } from "@turftap/contract";
import type { Payment } from "@turftap/contract/client";
import { ApiError, formatMoney } from "@turftap/ui";
import { BadgeCheck, ReceiptText } from "lucide-react";
import { useEffect, useState } from "react";

import { EmptyState } from "../../components/EmptyState";
import { Row, ROW_LINK, Rows } from "../../components/Rows";
import { Section } from "../../components/Section";
import { SkeletonRows } from "../../components/SkeletonRows";
import { TopicTile } from "../../components/TopicTile";
import { usePresence } from "../../components/usePresence";
import m from "../../i18n/en/receipts";
import { can } from "../../lib/tenant/activeTenant";
import { ReceiptCheck } from "./ReceiptCheck";
import {
  useCheckReceipt,
  usePaidBooking,
  usePaidMembership,
  useWaitingReceipts,
} from "./useReceiptChecks";

type Props = {
  tenant: MyTenant | undefined;
  onOpenBooking?: (bookingId: number) => void;
};

/**
 * PAY-07: the receipts waiting for a check, oldest first, beside the one being checked.
 * After a decision the next one slides in.
 */
export function ReceiptQueue({ tenant, onOpenBooking }: Props) {
  const { data, isPending } = useWaitingReceipts();
  const [decided, setDecided] = useState<ReadonlySet<number>>(new Set());
  const [pickedId, setPickedId] = useState<number>();
  const waiting = (data ?? []).filter((payment) => !decided.has(payment.id));
  const current = waiting.find((payment) => payment.id === pickedId) ?? waiting[0];

  const check = useCheckReceipt();
  const decide = (id: number, status: "ACCEPTED" | "REJECTED", rejectReason?: string) =>
    check.mutate(
      { path: { id }, body: { status, rejectReason } },
      { onSuccess: () => setDecided((ids) => new Set(ids).add(id)) },
    );
  const pick = (id: number) => {
    check.reset();
    setPickedId(id);
  };

  if (isPending) return <QueueSkeleton />;
  if (!data?.length && !check.error)
    return (
      <EmptyState hue="money" icon={ReceiptText}>
        {m.empty}
      </EmptyState>
    );

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <Section hue="money" icon={ReceiptText} title={m.waiting} count={waiting.length}>
        <WaitingRows waiting={waiting} currentId={current?.id} onPick={pick} />
      </Section>
      <div className="grid min-w-0 gap-4">
        {check.error instanceof ApiError && (
          <Alert status="danger" role="alert" className="animate-tt-rise">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>{check.error.message}</Alert.Title>
            </Alert.Content>
          </Alert>
        )}
        {current ? (
          <ReceiptCheck
            key={current.id}
            payment={current}
            onOpenBooking={onOpenBooking}
            deciding={check.isPending ? decidingOf(check.variables.body.status) : undefined}
            onDecide={
              can(tenant, "payments:update")
                ? (status, rejectReason) => decide(current.id, status, rejectReason)
                : undefined
            }
          />
        ) : (
          <EmptyState hue="money" icon={ReceiptText}>
            {m.empty}
          </EmptyState>
        )}
      </div>
    </div>
  );
}

const decidingOf = (status: PaymentStatus) => (status === "PENDING_CHECK" ? undefined : status);

type RowsProps = {
  waiting: Payment[];
  currentId: number | undefined;
  onPick: (id: number) => void;
};

function WaitingRows({ waiting, currentId, onPick }: RowsProps) {
  const shown = usePresence(waiting, (payment) => payment.id);
  const now = useNow();
  return (
    <Rows label={m.waiting}>
      {shown.map(({ item: payment, isNew, isLeaving }, index) => (
        <Row
          key={payment.id}
          index={index}
          landed={isNew}
          leaving={isLeaving}
          current={payment.id === currentId}
          lead={<TopicTile hue="money" icon={ReceiptText} />}
          title={
            <button
              type="button"
              data-row-link
              aria-current={payment.id === currentId || undefined}
              className={`${ROW_LINK} cursor-pointer text-start`}
              onClick={() => onPick(payment.id)}
            >
              <CustomerName payment={payment} />
            </button>
          }
          detail={
            <>
              {payment.membershipId !== null && <PlanName membershipId={payment.membershipId} />}
              <span className="tabular-nums">{formatMoney(payment.amount)}</span>
              <span>{m.waited(payment.createdAt, now)}</span>
            </>
          }
        />
      ))}
    </Rows>
  );
}

const NOW_REFRESH_MS = 60_000;

/** Keeps "Waiting 4 min" true while the page stays open. */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), NOW_REFRESH_MS);
    return () => clearInterval(timer);
  }, []);
  return now;
}

function CustomerName({ payment }: { payment: Payment }) {
  const { data: booking } = usePaidBooking(payment.bookingId);
  const { data: membership } = usePaidMembership(payment.membershipId);
  const name = (booking ?? membership)?.customerName;
  if (!name) return <Skeleton className="inline-block h-4 w-32 rounded-md align-middle" />;
  return <>{name}</>;
}

/** A membership receipt names its plan, in the memberships hue, so the two kinds tell apart. */
function PlanName({ membershipId }: { membershipId: number }) {
  const { data: membership } = usePaidMembership(membershipId);
  return (
    <span className="inline-flex min-w-0 items-center gap-1 tt-hue-membership">
      <BadgeCheck aria-hidden size={13} className="shrink-0 text-[var(--tt-hue)]" />
      {membership ? (
        <span className="truncate">{membership.planName}</span>
      ) : (
        <Skeleton className="inline-block h-3 w-20 rounded" />
      )}
    </span>
  );
}

function QueueSkeleton() {
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="tt-panel p-2">
        <SkeletonRows label={m.loading} rows={3} />
      </div>
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}
