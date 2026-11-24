import type { PriceRule } from "@turftap/contract/client";
import { formatMoney } from "@turftap/ui";
import { Trash2 } from "lucide-react";

import { IconAction } from "../../components/IconAction";
import { Row, Rows } from "../../components/Rows";
import { usePresence } from "../../components/usePresence";
import { EmptyLine } from "../../components/Section";
import { SkeletonRows } from "../../components/SkeletonRows";
import m from "../../i18n/en/prices";
import { useDeletePriceRule } from "./useChangePriceRules";
import { usePriceRules } from "./usePriceRules";

type Props = { resourceId: number; canDelete: boolean };

const describe = (rule: PriceRule) =>
  m.rule(rule.weekdays.map((day) => m.weekdays[day - 1]).join(", "), rule.startTime, rule.endTime);

/** VEN-05: the resource's Price Rules, each as its days of the week, its hours and its price. */
export function PriceRuleList({ resourceId, canDelete }: Props) {
  const { data: rules, isPending } = usePriceRules(resourceId);

  if (isPending)
    return (
      <div className="p-3">
        <SkeletonRows label={m.rulesLoading} rows={2} />
      </div>
    );
  if (!rules?.length) return <EmptyLine>{m.noRules}</EmptyLine>;
  return <RuleRows rules={rules} canDelete={canDelete} />;
}

function RuleRows({ rules, canDelete }: { rules: PriceRule[]; canDelete: boolean }) {
  const deleteRule = useDeletePriceRule();
  const shown = usePresence(rules, (rule) => rule.id);
  return (
    <Rows label={m.rulesTitle}>
      {shown.map(({ item: rule, isNew, isLeaving }, index) => (
        <Row
          key={rule.id}
          index={index}
          landed={isNew}
          leaving={isLeaving}
          lead={<WeekStrip days={rule.weekdays} />}
          title={
            <>
              <span aria-hidden className="tabular-nums">
                {m.hours(rule.startTime, rule.endTime)}
              </span>
              <span className="sr-only">{describe(rule)}</span>
            </>
          }
          end={
            <>
              <span className="pe-2 font-semibold tabular-nums">{formatMoney(rule.price)}</span>
              {canDelete && (
                <IconAction
                  danger
                  icon={Trash2}
                  label={m.deleteRuleFor(describe(rule))}
                  hint={m.deleteRule}
                  isPending={deleteRule.isPending && deleteRule.variables?.path.id === rule.id}
                  onPress={() => deleteRule.mutate({ path: { id: rule.id } })}
                />
              )}
            </>
          }
        />
      ))}
    </Rows>
  );
}

/** Monday to Sunday as seven letters; the rule's days are filled in. */
function WeekStrip({ days }: { days: number[] }) {
  return (
    <span aria-hidden className="flex gap-0.5 tt-hue-money">
      {m.weekdays.map((name, index) => {
        const on = days.includes(index + 1);
        return (
          <span
            key={name}
            className={`grid size-6 place-items-center rounded-md text-xs font-semibold ${on ? "bg-[var(--tt-hue)] text-white" : "bg-[var(--tt-field)] text-muted"}`}
          >
            {name.charAt(0)}
          </span>
        );
      })}
    </span>
  );
}
