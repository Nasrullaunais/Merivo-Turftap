import { useEffect, useRef } from "react";

import { SendIcon } from "./Icons";

const MAX_INPUT_HEIGHT_PX = 140;

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
}

export function Composer({ value, onChange, onSend }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, MAX_INPUT_HEIGHT_PX) + "px";
  }, [value]);

  const canSend = value.trim() !== "";

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSend) onSend();
    }
  };

  return (
    <footer className="composer">
      <div className="composer__row">
        <textarea
          ref={ref}
          className="composer__input"
          rows={1}
          value={value}
          placeholder="Write as the customer…"
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKey}
          spellCheck={false}
        />
        <button
          type="button"
          className="composer__send"
          disabled={!canSend}
          onClick={onSend}
          aria-label="Send message"
        >
          <SendIcon size={19} />
        </button>
      </div>
    </footer>
  );
}
