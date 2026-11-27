import type { Settings } from "../types";
import { RefreshIcon, SlidersIcon } from "./Icons";

interface Props {
  settings: Settings;
  live: boolean;
  panelOpen: boolean;
  onTogglePanel: () => void;
  onNewChat: () => void;
}

export function Header({ settings, live, panelOpen, onTogglePanel, onNewChat }: Props) {
  return (
    <header className="head">
      <div className="head__bar">
        <div className="head__id">
          <span className="head__mark mono">TT</span>
          <div className="head__title">
            <h1>TurfTap Assistant</h1>
            <p>WhatsApp chat emulator</p>
          </div>
        </div>

        <div className="head__actions">
          <button
            type="button"
            className="ibtn"
            onClick={onNewChat}
            title="Clear the screen (the Assistant still remembers)"
            aria-label="New chat"
          >
            <RefreshIcon />
          </button>
          <button
            type="button"
            className={"ibtn" + (panelOpen ? " ibtn--on" : "")}
            onClick={onTogglePanel}
            title="Business number and your phone"
            aria-label="Settings"
            aria-expanded={panelOpen}
          >
            <SlidersIcon />
          </button>
        </div>
      </div>

      <dl className="readout mono">
        <div className="readout__cell">
          <dt>BUSINESS NUMBER</dt>
          <dd className={settings.businessNumberId ? "" : "readout__empty"}>
            {settings.businessNumberId || "unset"}
          </dd>
        </div>
        <div className="readout__cell">
          <dt>YOU</dt>
          <dd className={settings.phone ? "" : "readout__empty"}>{settings.phone || "unset"}</dd>
        </div>
        <div className="readout__cell readout__cell--status">
          <dt>LINK</dt>
          <dd className={"link " + (live ? "link--up" : "link--down")}>
            <span className="link__dot" />
            {live ? "ready" : "set up"}
          </dd>
        </div>
      </dl>
    </header>
  );
}
