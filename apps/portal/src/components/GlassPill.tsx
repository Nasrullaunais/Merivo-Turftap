import { TONE_CLASS, type Tone } from "./look";

/** A pill that sits on a photo: frosted dark glass, white words and a dot in the tone. */
export function GlassPill({
  tone,
  live,
  children,
}: {
  tone: Tone;
  live?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex h-7 animate-tt-fade items-center gap-2 rounded-full bg-black/40 px-3 text-xs font-medium text-white ring-1 ring-white/20 backdrop-blur-md">
      <span className={`${TONE_CLASS[tone]} relative inline-grid`}>
        <span className="tt-dot" />
        {live && <span className="tt-beacon" />}
      </span>
      {children}
    </span>
  );
}
