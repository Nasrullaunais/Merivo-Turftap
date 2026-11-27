import type { Offer } from "./sportLook";

const STRIPES = [0, 1, 2, 3, 4, 5, 6, 7];
const POCKETS = [28, 200, 372].flatMap((x) => [28, 272].map((y) => ({ x, y })));
const RACK_COLOURS = [
  ["#f5c518"],
  ["#1d4fd8", "#d62828"],
  ["#6b21a8", "#111111", "#f97316"],
  ["#15803d", "#7f1d1d", "#f5c518", "#1d4fd8"],
];
const BALL_GAP = 19;
const RACK_APEX = { x: 262, y: 150 };

/** Drawn backgrounds for a sport or the gym, shown when the venue has no photo of it yet. */
export function SportScene({ offer, className }: { offer: Offer; className?: string }) {
  return (
    <svg
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      className={className}
    >
      {SCENES[offer]}
      <rect width="400" height="300" fill="url(#tt-scene-light)" />
      <defs>
        <radialGradient id="tt-scene-light" cx="0.3" cy="0.15" r="0.9">
          <stop offset="0" stopColor="white" stopOpacity="0.22" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}

const SCENES: Record<Offer, React.ReactNode> = {
  FUTSAL_COURT: (
    <>
      <rect width="400" height="300" fill="#17733a" />
      {STRIPES.map((stripe) => (
        <rect key={stripe} x={stripe * 50} width="25" height="300" fill="#1c8243" />
      ))}
      <g fill="none" stroke="white" strokeOpacity="0.85" strokeWidth="3">
        <rect x="20" y="20" width="360" height="260" rx="4" />
        <line x1="200" y1="20" x2="200" y2="280" />
        <circle cx="200" cy="150" r="42" />
        <path d="M20 88h56v124H20M380 88h-56v124h56" />
        <path d="M20 122h-8v56h8M380 122h8v56h-8" />
      </g>
      <circle cx="200" cy="150" r="4" fill="white" />
      <circle cx="268" cy="112" r="12" fill="white" />
      <path d="M268 105l6 4-2 7h-8l-2-7z" fill="#1b1b1b" />
    </>
  ),
  TABLE_TENNIS_TABLE: (
    <>
      <rect width="400" height="300" fill="#14223f" />
      <rect x="40" y="42" width="320" height="216" rx="6" fill="#1f56b8" />
      <g fill="none" stroke="white" strokeWidth="4">
        <rect x="46" y="48" width="308" height="204" rx="3" />
      </g>
      <line x1="46" y1="150" x2="354" y2="150" stroke="white" strokeWidth="2" />
      <rect x="195" y="30" width="10" height="240" rx="2" fill="#0b1530" />
      <line x1="195" y1="30" x2="195" y2="270" stroke="white" strokeOpacity="0.9" strokeWidth="2" />
      <g transform="rotate(-35 92 226)">
        <rect x="86" y="246" width="12" height="40" rx="5" fill="#c98b4f" />
        <circle cx="92" cy="226" r="28" fill="#d63a3a" />
      </g>
      <g transform="rotate(145 316 76)">
        <rect x="310" y="96" width="12" height="40" rx="5" fill="#c98b4f" />
        <circle cx="316" cy="76" r="28" fill="#1b1b1b" />
      </g>
      <ellipse
        cx="248"
        cy="104"
        rx="22"
        ry="5"
        fill="#ffb347"
        opacity="0.3"
        transform="rotate(-18 248 104)"
      />
      <circle cx="268" cy="98" r="7" fill="#ff9f1c" />
    </>
  ),
  POOL_TABLE: (
    <>
      <rect width="400" height="300" fill="#5b2e19" />
      <rect x="22" y="22" width="356" height="256" rx="10" fill="#0e5e41" />
      <rect x="30" y="30" width="340" height="240" rx="6" fill="#127451" />
      {POCKETS.map(({ x, y }) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="13" fill="#0b0b0b" />
      ))}
      {[100, 300].map((x) => (
        <circle key={x} cx={x} cy="12" r="2.5" fill="#f3e2c4" />
      ))}
      <line
        x1="110"
        y1="30"
        x2="110"
        y2="270"
        stroke="white"
        strokeOpacity="0.18"
        strokeWidth="2"
      />
      {RACK_COLOURS.map((row, column) =>
        row.map((colour, place) => (
          <circle
            key={`${column}-${place}`}
            cx={RACK_APEX.x + column * BALL_GAP}
            cy={RACK_APEX.y + (place - (row.length - 1) / 2) * (BALL_GAP + 1)}
            r="9.5"
            fill={colour}
            stroke="black"
            strokeOpacity="0.25"
          />
        )),
      )}
      <circle cx="110" cy="150" r="9.5" fill="#fbfaf5" />
      <line
        x1="16"
        y1="236"
        x2="94"
        y2="164"
        stroke="#e4c08a"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <line
        x1="16"
        y1="236"
        x2="40"
        y2="214"
        stroke="#3b2414"
        strokeWidth="7"
        strokeLinecap="round"
      />
    </>
  ),
  GYM: (
    <>
      <rect width="400" height="300" fill="#2a1d16" />
      <rect y="210" width="400" height="90" fill="#1d1410" />
      {STRIPES.map((tile) => (
        <line
          key={tile}
          x1={tile * 56}
          y1="210"
          x2={tile * 56 - 30}
          y2="300"
          stroke="#2f221a"
          strokeWidth="2"
        />
      ))}
      <circle cx="330" cy="60" r="120" fill="#e8742a" opacity="0.18" />
      <rect x="96" y="143" width="208" height="14" rx="4" fill="#c9ccd1" />
      <g fill="#151515" stroke="#3a3a3a" strokeWidth="2">
        <rect x="108" y="100" width="22" height="100" rx="5" />
        <rect x="132" y="112" width="18" height="76" rx="5" />
        <rect x="270" y="100" width="22" height="100" rx="5" />
        <rect x="250" y="112" width="18" height="76" rx="5" />
      </g>
      <rect x="152" y="140" width="8" height="20" rx="2" fill="#e8742a" />
      <rect x="240" y="140" width="8" height="20" rx="2" fill="#e8742a" />
      <g transform="translate(40 206)">
        <path d="M14 0a16 16 0 0 1 28 0v8H14z" fill="none" stroke="#8a8f98" strokeWidth="6" />
        <circle cx="28" cy="28" r="24" fill="#8a8f98" />
      </g>
    </>
  ),
};
