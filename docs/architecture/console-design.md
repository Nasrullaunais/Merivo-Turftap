# Staff Console design

How the Staff Console looks, moves and guides people, and how to build a screen that fits. Read it before touching anything under `apps/console/src`.

Status: written 2026-11-24. The shell, tokens and loading parts are built; the colour map in §3 is waiting for the user's approval on the running console.

The starting point is GenexoAI's gam-ui V2 (`genexoai/gam-ui`, branch `v2`, docs `design-language.md` and `v2-look-guide.md`). We take its sidebar, its neutral surfaces, its "hue says what, tone says how" colour rule and its motion vocabulary. We change the accent to teal, add colours for our own kinds of things, and stay light-only for now.

## 1. Principles

1. **The screen explains itself.** People learn the console from where things sit, what colour they are and how they move, not from sentences. If a screen needs a paragraph to be understood, change the screen.
2. **Colour always means something.** Every colour is either *what kind of thing* (hue, §3.2) or *how it is doing* (tone, §3.3). A colour doing neither is removed.
3. **Every press gets an answer.** A press shows something at once: a pressed look, a spinner, a fill, a flash. Nothing is ever silent, and nothing can be pressed twice by mistake.
4. **Motion explains change.** Things rise in when they arrive, fold when they open, flash when they changed, shake when something is missing. Each effect has one meaning (§6), so people learn what it says.
5. **Nothing jumps.** Loading shapes match the content that replaces them. Buttons keep their width while busy. Hover never moves anything.
6. **Simple first.** Each extra effect, part or option needs a reason in one sentence (AGENTS.md "Decisions").

## 2. Words

Words are the last tool, used only for what structure, icons and colour can't say.

| Use words for | Don't use words for |
|---|---|
| Names of things: "Futsal Court 1", "Kick Off Arena" | Instructions: "Click here to add a venue" |
| Numbers, money, dates and times | Describing a screen: "This page shows your bookings" |
| The label of an action: "Add venue", "Accept" | Repeating what an icon and colour already say |
| A field's label (people using screen readers need it) | Placeholders that are hints. A search box says only "Search" |
| An error the screen can't show: "This phone number already belongs to Saman" | Success messages for things the user can see happen |

- **Empty states**: an icon in its hue, one short sentence, and the action that fills it. "No resources yet." + **Add resource**.
- **Icon-only buttons** carry an `aria-label` and show it as a tooltip on hover or focus. The tooltip is the name only ("Next day"), never a sentence.
- **Group headings in the sidebar** are left out: space and a hairline separate the groups.
- **Labels are short**: two or three words. A field that needs a hint gets a better label or a better control, not a hint line.
- All text still lives in `i18n/en/` (frontend.md) and uses glossary words only.

## 3. Colour

### 3.1 Surfaces are neutral

Backgrounds are plain greys with no hue. Colour sits on things, never on the floor they stand on.

| Token | Role | Light |
|---|---|---|
| `--tt-canvas` | Page background behind everything | `#F7F7F7` |
| `--tt-panel` | Sidebar, cards, table rows | `#FFFFFF` |
| `--tt-field` | Inputs, segmented controls | `#F2F2F2` |
| `--tt-hover` | Rows, menu items, nav rows under the pointer | `#EEEEEE` |
| `--tt-line` | The 1px hairline around panels and between rows | `rgb(24 24 24 / 0.08)` |
| `--tt-line-strong` | Popovers, dialogs, warning boxes | `rgb(24 24 24 / 0.14)` |

- **A hairline draws every edge.** Panels are told apart by a 1px line, not by heavy shadows or different greys.
- **Shadow** is one soft two-layer shadow for cards (`--tt-shadow-card`) and a bigger one for dialogs and popovers. Nothing else casts a shadow.
- **Radius** has three steps: 6px for chips and icon buttons, 8px for buttons, inputs and rows, 12px for panels and dialogs. `rounded-full` is only for dots, avatars and pills.
- **Light only for now.** Every colour is a token in `apps/console/src/styles/globals.css`, so dark mode is one more block of values later, not a rewrite. Never write a raw colour (`#fff`, `bg-white`, `text-gray-500`) in a component.

### 3.2 Hue says what kind of thing it is

A hue sits on an **icon tile** (`TopicTile`): a small rounded square, tinted in the hue, with the thing's icon. The same kind of thing has the same hue and icon on every screen: in the sidebar, in lists, in forms, in page headers and in empty states. The sidebar is the legend: a person who has used it knows the map.

| Hue | Token | Kind | Glossary things | Icon |
|---|---|---|---|---|
| Teal (the accent) | `--tt-hue-booking` | Bookings | Booking, Walk-in Booking, Repeat Series, Slot, the calendar | `CalendarDays` |
| Indigo | `--tt-hue-place` | Places | Venue, Resource, Photo | `MapPin` (venue), `LayoutGrid` (resource) |
| Violet | `--tt-hue-money` | Money | Payment, Transfer Receipt, Receipt Check, Refund, Price Rule, Advance, Balance | `Wallet`, `ReceiptText` |
| Orange | `--tt-hue-membership` | Memberships | Membership Plan, Membership, Check-in | `BadgeCheck` |
| Pink | `--tt-hue-people` | People | Customer, Staff | `Users` |
| Slate | `--tt-hue-plain` | Everything else | Closed Date, Blocked Time, settings | `CalendarOff`, `Ban` |

A new hue is the user's decision. Don't invent one; use slate until it is decided.

### 3.3 Tone says how it is doing

A tone sits on a **state pill** (`StatePill`: icon + label) or a **state dot** (`StateDot`: dot + label). When two states sit side by side, the main one is a pill and the other a dot, so a row never becomes a wall of pills.

| Tone | Colour | Means |
|---|---|---|
| `good` | Green | Fine, nothing to do |
| `busy` | Blue | In someone's hands, being worked on |
| `watch` | Amber | Needs attention soon; also "changed, not saved yet" |
| `bad` | Red | Overdue, rejected, destructive |
| `off` | Slate | Inactive, finished, nothing |

Each state has one tone and one icon, the same everywhere:

| Thing | State | Tone | Icon |
|---|---|---|---|
| Booking | Waiting for payment (`AWAITING_PAYMENT`) | watch | `Hourglass` |
| Booking | Waiting for receipt check (`AWAITING_CHECK`) | busy | `ScanSearch` |
| Booking | Confirmed (`CONFIRMED`) | good | `CircleCheck` |
| Booking | Cancelled, Expired | off | `CircleX`, `TimerOff` |
| Calendar | Blocked Time | off, with diagonal stripes | `Ban` |
| Payment | Waiting for check (`PENDING_CHECK`) | busy | `ScanSearch` |
| Payment | Accepted, Rejected | good, bad | `CircleCheck`, `CircleX` |
| Membership | Waiting for payment, Active, Ended, Expired | watch, good, off, off | as for bookings, `BadgeCheck` for Active |

**Colour is never alone.** Every tone comes with an icon or a label, so it can be read without seeing colour (WCAG AA).

### 3.4 Teal is the accent

Teal (`--accent`, `oklch(0.52 0.1 186)`, white text at 5:1) does two jobs only:

- **Actions**: the one primary button in a view, links, the focus ring, selected controls.
- **Where you are**: the current page in the sidebar (teal tint plus a teal bar on its edge) and the accent mark beside the page title.

Teal is also the bookings hue, because bookings are the product's centre. Green (`good`) is a different, yellower green, and always comes with an icon.

## 4. Type, icons and numbers

- **Font**: HeroUI's default system font stack. Sizes: page title `text-2xl font-semibold`, section heading `text-xs uppercase tracking-[.08em]` with the accent mark, body `text-sm`, small details `text-xs text-muted`.
- **Numbers** that line up in columns (money, times, counts) use `tabular-nums`. Money is formatted only with `formatMoney`, times only in the venue's time zone (frontend.md).
- **Icons** come from `lucide-react` only. Sizes: 16px inside buttons and pills, 18px in sidebar rows, 20px in the top row and the rail. Stroke width stays at the default 2. An icon that means a kind of thing or a state uses the icon from the tables in §3; don't pick a second icon for the same meaning.

## 5. The shell

The shell is built once, in `apps/console/src/layout/`, and wraps every page under the tenant.

```
┌───────────┬──────────────────────────────────────────────┐
│ ◆ TurfTap │ [≡]  ▌ Calendar                    [actions]  │
│           │                                              │
│ ▣ Calendar│   page content (rises in)                    │
│ ▣ Receipts│                                              │
│ ──────────│                                              │
│ ▣ Venues ▾│                                              │
│ ▣ Staff   │                                              │
│           │                                              │
│ ┌───────┐ │                                              │
│ │Tenant ⌄│ │                                              │
│ └───────┘ │                                              │
└───────────┴──────────────────────────────────────────────┘
```

### 5.1 Sidebar (from gam-ui V2)

- **Width** 256px open, 64px as an icon **rail**. The toggle sits at the start of the page's top row. The choice is remembered in `localStorage`. The width animates over `--tt-dur-3`.
- **Logo row** is 56px high, the same height as the page's top row, so the two line up across the seam.
- **Groups** (desk work, selling, setting up) are separated by space and a hairline, without headings (§2).
- **A section row**: its hue tile, its name, then on the right an optional count badge, an optional **+** action (e.g. "New walk-in booking") and a chevron when it has sub-pages. Link, **+** and chevron are separate buttons, never nested. Badges and **+** actions arrive with the screens that need them (T18, T20).
- **Two "you are here" marks that nest**: the section you are in turns its tile solid (white icon on the hue); the page you are on gets the teal tint fill and the teal bar on the sidebar's edge.
- **Count badges** appear only when someone must act (receipts waiting for a check). A zero shows nothing. The number pops in when it changes.
- **Rail mode**: tiles only, centred. Hover or focus shows the name as a tooltip on the right after 150ms. A count shows as a small dot-badge on the tile's corner.
- **Phones and narrow screens** (below `md`): the sidebar becomes a drawer over a dimmed page. It closes on a tap outside, on `Escape`, and when the user goes to another page.
- **The bottom card** shows the tenant and your role. Pressing it opens a menu: Switch tenant (only with more than one tenant) and Sign out.
- **Sub-pages** (Memberships and Membership Plans, say) fold under their section with a chevron, one section open at a time. No section has sub-pages yet; the first one (T22/T24) adds this to `Sidebar` and `config/nav.ts`.
- Only the pages a person may open are shown (`config/routePermissions.ts`). A section with no allowed pages is hidden, not greyed out.

Nav map, built and planned:

| Group | Section | Hue | Page | Ticket |
|---|---|---|---|---|
| Desk | Calendar, **+** walk-in | booking | `/calendar` | T17, T18 |
| Desk | Receipt Checks, with count badge | money | `/receipt-checks` | T20 |
| Desk | Check-ins | membership | `/check-ins` | T25 |
| Sell | Memberships (Memberships, Membership Plans) | membership | `/memberships`, `/membership-plans` | T22, T24 |
| Sell | Repeat Series | booking | `/repeat-series` | T21 |
| Set up | Venues (each venue, its resources) | place | `/venues` | built |
| Set up | Staff | people | `/staff` | built |

### 5.2 The page frame

Every page uses `PageLayout` from `layout/`. It owns:

- **The top row**: nav toggle, then the accent mark (a 4px teal bar) and the title, then the page's actions on the right. There is no separate top bar above it and no breadcrumb trail.
- **`backTo`**: a detail page (a venue, a resource) shows an arrow before the title that goes one level up. There is never a second hop.
- **Width**: `width="full"` (calendar, lists, queues: up to 1600px) or `width="form"` (forms and settings: a centred 768px column).
- **Arrival**: the content rises in once when the page opens (§6).

## 6. Motion

All motion is plain CSS plus the browser's View Transitions, with no animation library. gam-ui does the same, and HeroUI v3's own animations are CSS.

### 6.1 Timing tokens

| Token | Value | For |
|---|---|---|
| `--tt-dur-1` | 120ms | Tone and colour changes: hover, pressed, selected |
| `--tt-dur-2` | 200ms | Things entering or leaving: rows, chips, panels |
| `--tt-dur-3` | 320ms | Folding, the sidebar width, drawers, dialogs |
| `--tt-ease` | `cubic-bezier(.2,.8,.2,1)` | Everything, except the small overshoot of `tt-pop` |

### 6.2 What each effect means

Arriving:

| Effect | The user sees | Plays when |
|---|---|---|
| Skeleton (`Skeleton`) | Grey shapes with a moving sheen, shaped like what is coming | First load only |
| `tt-rise` | A small rise (4px) and fade | Page content, tab content, a dialog's body, empty states |
| `tt-sweep` | Rows rise one after another, 30ms apart, first 12 only | A list's rows arrive for the first time, a new page of rows |
| `tt-fade` | A plain short fade | Search, filter or sort swaps the rows |
| View transition | A row's tile and name travel into the page header | A row opens its record's page |

Answering an action:

| Effect | The user sees | Plays when |
|---|---|---|
| Hover | Background tone change only | The pointer is over anything pressable |
| Pressed | Shrinks to 98% while held (HeroUI's own) | A button or row is pressed |
| Spinner in the button | A spinner takes the icon's place (or the label's), the width doesn't change | Its action is running (§7) |
| `Collapse` | Height folds open or shut, with a fade | Sidebar sections, form steps, read ↔ edit |
| `tt-pop` | A small thing scales in with a slight overshoot | A badge count, a check mark, a new pill value |
| `tt-flash` | A soft tint in the thing's hue that fades | A field was filled in for the user |
| `tt-saved` | A green tint that fades | A value was just saved |
| `tt-landed` | A longer teal tint | A new row arrived: a booking created here, or one that came in live (T14 events) |
| `tt-nudge` | A short sideways shake | A required field is missing on submit |
| `tt-leave` | The thing fades and shrinks a little | A record was deleted or cancelled |

### 6.3 Rules

- **Once.** An arrival effect plays when content first appears, never again on a background refetch. Only the skeleton sheen and spinners loop.
- **Hover never moves anything**: tone only. Movement is for things that change, not for things that could.
- **No long waits for effects.** Nothing over 400ms blocks a person from their next press, except the slower saved and landed tints, which never block anything.
- **Reduced motion.** With `prefers-reduced-motion: reduce`, every animation and transition is cut to near zero (one rule in `globals.css`), and view transitions are skipped by checking the media query first. Content still appears; it just doesn't move.

## 7. Loading

- **Never a lone spinner for content.** Anything that loads shows a skeleton shaped like the content it will become: a list shows skeleton rows with the same columns, a heading shows a skeleton title, the calendar shows its grid with skeleton blocks. When the data lands, nothing moves.
- **The shell never loads.** Sidebar and page frame stay on screen; only the parts waiting for data are skeletons.
- **First load only.** A refetch with content already on screen keeps the content (TanStack Query's `isPending` is true only on the first load). A live update swaps in quietly, and new rows play `tt-landed`.
- **Known parts show at once.** If a list already knows a record's name, its page shows the name straight away and skeletons only the rest.
- **Buttons that start work use `LoadingButton`** (`components/LoadingButton.tsx`). While the action runs it can't be pressed again and keeps its width. A button with an icon swaps the icon for a spinner and keeps its label; a button without one fades its label out and shows the spinner in its place. A row's own button (Reopen, Unblock) is busy only for that row. Never pass `isPending` to a bare HeroUI `Button`: it blocks presses but shows nothing.
- **Skeleton parts**: `Skeleton` from HeroUI for single shapes; `SkeletonRows` (`components/`) for lists. Each skeleton has `role="status"` with an `aria-label` from the catalog, so screen readers hear "Loading venues".

## 8. Every press and hover

| Element | Rest | Hover | Pressed | Focus (keyboard) | Busy | Done |
|---|---|---|---|---|---|---|
| Primary button (one per view) | Teal fill | Slightly darker teal | 98% scale | 2px teal ring, offset | Spinner, same width | Result shown in place (row lands, value flashes) |
| Other buttons | Grey fill or outline | `--tt-hover` | 98% scale | Ring | Spinner | As above |
| Icon-only button | Icon in muted grey | `--tt-hover`, icon to full colour, tooltip after 300ms | 98% scale | Ring + tooltip | Spinner | — |
| Danger action | Red outline or soft red | Darker | 98% scale | Ring | Spinner | `tt-leave` on what it removed |
| List row | Panel | `--tt-hover` | — | Ring around the row | — | Opens the record's page |
| Sidebar row | Muted text | `--tt-hover`, text to full colour | — | Ring | — | Teal tint + bar |
| Calendar free slot | Empty | Faint teal tint with a **+** and the time | — | Ring | — | Opens walk-in (T18) |
| Calendar booking | Tone tint, icon, name | Slightly stronger tint | — | Ring | — | Opens booking details (T19) |
| Field | `--tt-field` fill + hairline | `--tt-hover` | — | Stronger line + ring | — | `tt-saved` after saving |

- **Everything pressable** has `cursor: pointer`, a hover tone, a pressed look and a visible focus ring. Nothing that can't be pressed looks pressable.
- **The primary action stays enabled.** Pressed too early, it doesn't explain in a sentence: it moves the focus to the first missing field, marks it red and plays `tt-nudge`.
- **Destructive actions ask first** in a dialog that names the thing with its tile, says what goes with it, and has **Keep it** as the cancel button. Undoable or unsaved things don't ask.
- **Success is shown where it happened**, not in a toast: the row lands, the value flashes green, the pill pops to its new state. Toasts are for failures (frontend.md) and for things that happen off-screen.
- **Touch targets** are at least 40×40px, because desks often use tablets.
- **Keyboard**: everything works without a mouse, in reading order. `Escape` closes the topmost layer.

## 9. Page patterns

These are the shapes to reuse. Build new screens from them before inventing a new one.

- **List** (venues, staff, memberships): one table in a frame; first column is the record's tile and name; toolbar in one row (search, filters in their hue, then the create button at the far end). Row press opens the record's page. Empty: tile, one sentence, action.
- **Record page** (a venue, a resource, a booking): three layers. The header says *how it is doing* (tile, name, state pills, main action). The sections say *what it is* (read first, a pencil edits in place). The tabs or lists below say *what happened* or *what belongs to it*.
- **Form**: one centred column of steps. Required steps open, optional ones folded to a one-line summary. Choices you can see (pills, cards) beat dropdowns when there are a handful. Fill in what can be worked out (a resource picked fills its venue), and flash what was filled.
- **Queue** (receipt checks): one item at a time, large, with the decision buttons in their tones (Accept green, Reject red). The next item slides in after a decision. The sidebar count drops with a pop.
- **Calendar**: the grid is the page. States follow §3.3. Free slots invite a press on hover. A booking arriving live plays `tt-landed`.

**Saving.** Fields of one record change only when the user presses Save; a change not yet saved shows an amber dot. Anything that is a record of its own (a payment, a Blocked Time, a photo) takes effect at once from its own button.

## 10. Where things live

| What | Where |
|---|---|
| Colour, surface, motion tokens and keyframes | `apps/console/src/styles/globals.css` |
| Brand accent shared with the portal | `packages/ui/src/theme.css` |
| Sidebar (`Sidebar`), shell (`AppShell`), page frame (`PageLayout`) | `apps/console/src/layout/` |
| Nav items, their hues and icons | `apps/console/src/config/nav.ts` |
| `LoadingButton`, `SkeletonRows`, `SkeletonLine`, `TopicTile`, `StatePill`, `StateDot`, `BackLink`, `Collapse`; hue and tone names in `look.ts` | `apps/console/src/components/` |
| Text | `apps/console/src/i18n/en/` |

## 11. A screen is done when

- Every colour on it is a hue or a tone from §3, from a token.
- Everything that loads shows a skeleton shaped like its content, and every button that starts work uses `LoadingButton`.
- Every pressable thing has hover, pressed and focus looks (§8), and every icon-only button has a tooltip.
- Each effect from §6 that applies plays once, and with reduced motion the content still appears.
- No sentence on it could be replaced by structure, an icon or a colour.
- It works at phone width with the sidebar as a drawer.
- It ran locally with demo data and the user approved the look.

## 12. Left out on purpose

| Idea | Why not |
|---|---|
| Dark mode now | Half the colour and testing work; tokens make it a later addition |
| An animation library | CSS and View Transitions cover every effect in §6 |
| Breadcrumbs | The sidebar is the root; detail pages get one back arrow |
| Card views for lists | Tables are the only list view |
| Group headings in the sidebar | Space and a line separate groups; fewer words |
| Long placeholders and help text | Structure explains; a search box says "Search" |
| A centred spinner while content loads | Skeletons keep the layout still |
