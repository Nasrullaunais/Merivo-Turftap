import { type ReactNode, useLayoutEffect, useRef } from "react";

/** Eases to its content's height whenever that changes, so nothing below it jumps. */
export function SmoothHeight({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const outer = box.current;
    const inner = content.current;
    if (!outer || !inner) return;
    outer.style.height = `${inner.offsetHeight}px`;
    const observer = new ResizeObserver(() => {
      outer.style.transition = "height var(--tt-dur-3) var(--tt-ease)";
      outer.style.height = `${inner.offsetHeight}px`;
    });
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  return (
    // Clipped with a margin so focus rings and lifted cards at the edges still show.
    <div ref={box} className={`overflow-clip [overflow-clip-margin:8px] ${className}`}>
      <div ref={content}>{children}</div>
    </div>
  );
}
