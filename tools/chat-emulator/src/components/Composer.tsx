import { useEffect, useRef } from "react";

import { PaperclipIcon, SendIcon } from "./Icons";

const MAX_INPUT_HEIGHT_PX = 140;

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  /** A photo or file to send, with the typed text as its caption. */
  onAttach: (file: File) => void;
}

export function Composer({ value, onChange, onSend, onAttach }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
        <input
          ref={fileRef}
          type="file"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) onAttach(file);
          }}
        />
        <button
          type="button"
          className="composer__attach"
          onClick={() => fileRef.current?.click()}
          aria-label="Send a photo or file"
          title="Send a photo or file; the text you typed goes as its caption"
        >
          <PaperclipIcon />
        </button>
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
