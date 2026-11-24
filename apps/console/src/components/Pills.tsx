import { Description, FieldError, Label } from "@heroui/react";
import type { LucideIcon } from "lucide-react";
import { Checkbox, CheckboxGroup, Radio, RadioGroup } from "react-aria-components";

export const PILL =
  "inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-sm font-medium outline-none select-none tt-t1 border-[var(--tt-line)] bg-[var(--tt-field)] hover:bg-[var(--tt-hover)] data-selected:border-accent data-selected:bg-accent-soft data-selected:text-accent-soft-foreground data-focus-visible:ring-2 data-focus-visible:ring-focus data-focus-visible:ring-offset-1 data-disabled:cursor-not-allowed data-disabled:opacity-40 data-pressed:scale-[0.98]";

type Choice<T extends string> = {
  value: T;
  label: string;
  icon?: LucideIcon;
  isDisabled?: boolean;
};

type ChoiceProps<T extends string> = {
  name: string;
  label: string;
  description?: string;
  value: T;
  onChange: (value: T) => void;
  choices: Choice<T>[];
};

/** Pick one of a handful, all in view (console-design.md §9 "Form"). */
export function ChoicePills<T extends string>(props: ChoiceProps<T>) {
  return (
    <RadioGroup
      name={props.name}
      orientation="horizontal"
      value={props.value}
      onChange={(value) => props.onChange(value as T)}
      className="grid gap-2"
    >
      <Label>{props.label}</Label>
      {props.description && <Description>{props.description}</Description>}
      <div className="flex flex-wrap gap-2">
        {props.choices.map(({ value, label, icon: Icon, isDisabled }) => (
          <Radio key={value} value={value} isDisabled={isDisabled} className={PILL}>
            {Icon && <Icon aria-hidden size={16} />}
            {label}
          </Radio>
        ))}
      </div>
    </RadioGroup>
  );
}

type ToggleProps = {
  name: string;
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  choices: Choice<string>[];
  /** The message when nothing is picked. */
  required?: string;
};

/** Pick any of a handful, all in view. */
export function TogglePills({ required, ...props }: ToggleProps) {
  return (
    <CheckboxGroup
      name={props.name}
      isRequired={!!required}
      value={props.value}
      onChange={props.onChange}
      validate={(picked) => (required && picked.length === 0 ? required : null)}
      className="grid gap-2"
    >
      <Label>{props.label}</Label>
      <div className="flex flex-wrap gap-2">
        {props.choices.map(({ value, label, icon: Icon, isDisabled }) => (
          <Checkbox key={value} value={value} isDisabled={isDisabled} className={PILL}>
            {Icon && <Icon aria-hidden size={16} />}
            {label}
          </Checkbox>
        ))}
      </div>
      <FieldError />
    </CheckboxGroup>
  );
}
