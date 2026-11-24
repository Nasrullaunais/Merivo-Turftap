import type { PriceRule } from "@turftap/contract/client";
import { formatMoney } from "@turftap/ui";

import { SkeletonRows } from "../../components/SkeletonRows";
import { LoadingButton } from "../../components/LoadingButton";
import m from "../../i18n/en/prices";
import { useDeletePriceRule } from "./useChangePriceRules";
import { usePriceRules } from "./usePriceRules";

type Props = { resourceId: number; canDelete: boolean };

const describe = (rule: PriceRule) =>
  m.rule(rule.weekdays.map((day) => m.weekdays[day - 1]).join(", "), rule.startTime, rule.endTime);

export function PriceRuleList({ resourceId, canDelete }: Props) {
  const { data: rules, isPending } = usePriceRules(resourceId);
  const deleteRule = useDeletePriceRule();

  return (
    <section className="grid gap-2">
      <h2 className="text-lg font-semibold">{m.rulesTitle}</h2>
      {isPending && <SkeletonRows label={m.rulesLoading} rows={2} tile={false} />}
      {rules?.length === 0 && <p className="text-muted">{m.noRules}</p>}
      <ul className="grid divide-y divide-separator">
        {rules?.map((rule) => (
          <li key={rule.id} className="flex flex-wrap items-center gap-x-3 py-2">
            <span className="font-medium">{describe(rule)}</span>
            <span className="text-muted">{m.perSlot(formatMoney(rule.price))}</span>
            {canDelete && (
              <LoadingButton
                className="ml-auto"
                size="sm"
                variant="danger-soft"
                aria-label={m.deleteRuleFor(describe(rule))}
                isPending={deleteRule.isPending && deleteRule.variables?.path.id === rule.id}
                onPress={() => deleteRule.mutate({ path: { id: rule.id } })}
              >
                {m.deleteRule}
              </LoadingButton>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
