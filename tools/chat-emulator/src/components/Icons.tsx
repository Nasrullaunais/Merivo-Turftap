interface IconProps {
  size?: number;
  className?: string;
}

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export const SlidersIcon = ({ size = 18, className }: IconProps) => (
  <svg {...base(size)} className={className} aria-hidden="true">
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="18" x2="20" y2="18" />
    <circle cx="9" cy="6" r="2.2" fill="var(--ink)" />
    <circle cx="15" cy="12" r="2.2" fill="var(--ink)" />
    <circle cx="8" cy="18" r="2.2" fill="var(--ink)" />
  </svg>
);

export const RefreshIcon = ({ size = 18, className }: IconProps) => (
  <svg {...base(size)} className={className} aria-hidden="true">
    <path d="M21 12a9 9 0 1 1-2.64-6.36" />
    <polyline points="21 3 21 8 16 8" />
  </svg>
);

export const SendIcon = ({ size = 18, className }: IconProps) => (
  <svg {...base(size)} className={className} aria-hidden="true">
    <path d="M4 12l16-7-7 16-2.5-6.5L4 12z" />
  </svg>
);

export const ListIcon = ({ size = 16, className }: IconProps) => (
  <svg {...base(size)} className={className} aria-hidden="true">
    <line x1="9" y1="6" x2="20" y2="6" />
    <line x1="9" y1="12" x2="20" y2="12" />
    <line x1="9" y1="18" x2="20" y2="18" />
    <circle cx="4.5" cy="6" r="0.6" />
    <circle cx="4.5" cy="12" r="0.6" />
    <circle cx="4.5" cy="18" r="0.6" />
  </svg>
);

export const ReplyIcon = ({ size = 15, className }: IconProps) => (
  <svg {...base(size)} className={className} aria-hidden="true">
    <polyline points="9 14 4 9 9 4" />
    <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
  </svg>
);
