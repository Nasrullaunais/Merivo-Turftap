import { Button, Spinner } from "@heroui/react";
import { FileText, ImageUp, Send, X } from "lucide-react";
import { type ChangeEvent, type DragEvent, useMemo, useState } from "react";

import m from "../../i18n/en/booking";
import { isPdf, problemWith, type ReceiptProblem } from "./receiptFile";

const ACCEPTED = "image/jpeg,image/png,application/pdf";

type Props = { sending: boolean; onSend: (file: File) => void };

/** PAY-02: pick or drop the receipt, see it, then send it. A wrong file is refused before upload. */
export function ReceiptPicker({ sending, onSend }: Props) {
  const [file, setFile] = useState<File>();
  const [problem, setProblem] = useState<{ kind: ReceiptProblem; file: File }>();
  const [dragging, setDragging] = useState(false);

  const take = (picked: File | undefined) => {
    if (!picked) return;
    const kind = problemWith(picked);
    setProblem(kind && { kind, file: picked });
    setFile(kind ? undefined : picked);
  };
  const onPick = (event: ChangeEvent<HTMLInputElement>) => {
    take(event.currentTarget.files?.[0]);
    event.currentTarget.value = "";
  };
  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    take(event.dataTransfer.files[0]);
  };

  if (file) {
    return (
      <div className="grid animate-tt-rise gap-3">
        <div className="grid overflow-hidden rounded-xl border border-[var(--tt-line)]">
          <Preview file={file} />
          <div className="flex items-center gap-3 border-t border-[var(--tt-line)] py-2 pr-2 pl-3.5">
            <div className="grid min-w-0 flex-1">
              <span className="truncate text-sm font-medium">{file.name}</span>
              <span className="text-xs text-muted tabular-nums">{m.receipt.size(file.size)}</span>
            </div>
            <button
              type="button"
              onClick={() => setFile(undefined)}
              disabled={sending}
              aria-label={m.receipt.remove}
              className="tt-t1 grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-[var(--tt-hover)] hover:text-foreground active:scale-95 disabled:opacity-50"
            >
              <X size={18} aria-hidden />
            </button>
          </div>
        </div>
        <Button
          fullWidth
          size="lg"
          className="group"
          isPending={sending}
          onPress={() => onSend(file)}
        >
          {sending ? (
            <Spinner color="current" size="sm" />
          ) : (
            <Send
              size={17}
              aria-hidden
              className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          )}
          {m.receipt.send}
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <label
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        data-dragging={dragging}
        className="tt-hue-money group grid cursor-pointer justify-items-center gap-2 rounded-2xl border-2 border-dashed border-[color-mix(in_oklab,var(--tt-hue)_30%,var(--tt-line))] px-4 py-7 text-center transition-[background-color,border-color,scale] duration-200 hover:border-[var(--tt-hue)] hover:bg-[color-mix(in_oklab,var(--tt-hue)_6%,var(--tt-panel))] active:scale-[0.99] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--focus)] data-[dragging=true]:scale-[1.01] data-[dragging=true]:border-[var(--tt-hue)] data-[dragging=true]:bg-[color-mix(in_oklab,var(--tt-hue)_10%,var(--tt-panel))]"
      >
        <span
          className="tt-tile size-12 rounded-2xl transition-transform duration-200 group-hover:-translate-y-0.5 group-data-[dragging=true]:scale-110"
          data-on={dragging}
        >
          <ImageUp size={24} aria-hidden />
        </span>
        <span className="font-semibold">{dragging ? m.receipt.drop : m.receipt.choose}</span>
        <span className="text-sm text-muted">{m.receipt.chooseBody}</span>
        <span className="text-xs text-muted">{m.receipt.rules}</span>
        <input type="file" accept={ACCEPTED} onChange={onPick} className="sr-only" />
      </label>
      {problem && (
        <p
          key={`${problem.file.name}-${problem.file.size}`}
          role="alert"
          className="tt-tone-bad tt-tone-text animate-tt-nudge text-sm font-medium"
        >
          {problem.kind === "tooBig"
            ? m.receipt.tooBig(m.receipt.size(problem.file.size))
            : m.receipt.wrongType}
        </p>
      )}
    </div>
  );
}

/** A small look at the picked file: the photo itself, or a PDF sheet. */
function Preview({ file }: { file: File }) {
  // jsdom and very old browsers can't make object URLs; the PDF-style sheet stands in.
  const url = useMemo(
    () =>
      isPdf(file) || typeof URL.createObjectURL !== "function"
        ? undefined
        : URL.createObjectURL(file),
    [file],
  );

  if (!url) {
    return (
      <span className="tt-hue-money grid h-28 place-items-center bg-[color-mix(in_oklab,var(--tt-hue)_8%,var(--tt-panel))] text-[var(--tt-hue)]">
        <FileText size={40} strokeWidth={1.5} aria-hidden className="animate-tt-pop" />
      </span>
    );
  }
  return (
    <img
      src={url}
      alt={m.receipt.preview}
      // Released once drawn: releasing it on unmount broke the picture when React remounts in dev.
      onLoad={() => URL.revokeObjectURL(url)}
      onError={() => URL.revokeObjectURL(url)}
      className="h-52 w-full animate-tt-fade bg-[var(--tt-field)] object-contain"
    />
  );
}
