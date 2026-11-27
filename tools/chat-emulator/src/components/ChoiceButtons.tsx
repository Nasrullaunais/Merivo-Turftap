import { useState } from "react";

import type { Choice, Choices } from "../types";
import { ListIcon, ReplyIcon } from "./Icons";

interface Props {
  choices: Choices;
  onTap: (choices: Choices, choice: Choice) => void;
}

/** Reply buttons under the bubble, or a button that opens the list rows, as WhatsApp shows them. */
export function ChoiceButtons({ choices, onTap }: Props) {
  const [listOpen, setListOpen] = useState(false);

  if (choices.kind === "button") {
    return (
      <div className="choices">
        {choices.options.map((option) => (
          <button
            key={option.id}
            type="button"
            className="choice"
            onClick={() => onTap(choices, option)}
          >
            <ReplyIcon />
            {option.title}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="choices">
      <button
        type="button"
        className={"choice" + (listOpen ? " choice--open" : "")}
        aria-expanded={listOpen}
        onClick={() => setListOpen((open) => !open)}
      >
        <ListIcon />
        {choices.listButton ?? "Choose"}
      </button>
      <div className={"rows" + (listOpen ? " rows--open" : "")}>
        <ul className="rows__inner">
          {choices.options.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                className="row"
                tabIndex={listOpen ? 0 : -1}
                onClick={() => {
                  setListOpen(false);
                  onTap(choices, option);
                }}
              >
                {option.title}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
