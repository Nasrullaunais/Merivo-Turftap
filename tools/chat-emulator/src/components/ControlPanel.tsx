import type { Settings } from "../types";

interface Props {
  open: boolean;
  settings: Settings;
  onChange: (next: Settings) => void;
}

export function ControlPanel({ open, settings, onChange }: Props) {
  return (
    <section className={"panel" + (open ? " panel--open" : "")} aria-hidden={!open}>
      <div className="panel__inner">
        <div className="field-row">
          <label className="field">
            <span className="field__label">Business number · Meta id</span>
            <input
              className="field__input mono"
              inputMode="numeric"
              value={settings.businessNumberId}
              placeholder="100000000000001"
              onChange={(e) => onChange({ ...settings, businessNumberId: e.target.value.trim() })}
              spellCheck={false}
            />
          </label>
          <label className="field">
            <span className="field__label">You · customer phone</span>
            <input
              className="field__input mono"
              type="tel"
              inputMode="tel"
              value={settings.phone}
              placeholder="+94771234567"
              onChange={(e) => onChange({ ...settings, phone: e.target.value.trim() })}
              spellCheck={false}
            />
          </label>
        </div>
        <p className="panel__note">
          The business number is the Meta id given to{" "}
          <span className="mono">bun run whatsapp:link</span>; it decides which tenant you are
          writing to.
        </p>
      </div>
    </section>
  );
}
