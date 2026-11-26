# Customer Portal design

How the Customer Portal looks and moves. It follows [console-design.md](console-design.md) (principles, colour meanings, motion vocabulary, loading rules) and shares its tokens from `packages/ui/src/theme.css`. This page lists only what is different for customers on a phone.

Status: written 2026-11-26 with T27 (the shell), approved. §5 added with T28, approved. §6 added with T29, approved.

## 1. Phone first

- Designed at **360 px** wide, then widened. Content sits in one column on phones, at most `max-w-5xl` wide, with 16px side padding. Cards go two across from 640px and three from 1024px.
- Pages use `min-h-dvh`, so phone browser bars don't cut them off.

## 2. The shell (`layout/Shell.tsx`)

- **Top bar**: frosted (`tt-glass`), sticky, 64px tall. The tenant's initials on a teal square (`TenantMark`) and its name, which also becomes the browser tab's title. Pressing it goes home.
- **Pages open only once the tenant is known.** Until then the top bar and the page show skeletons shaped like what is coming. If the tenant can't be read, the whole page is replaced by a status page (§3), so no page ever shows its own "not found" toast.
- A soft teal wash behind the top of the page (`tt-canvas-glow`) is the brand; it never sits behind content.
- **Bottom nav** comes with T31.
- Locally the tenant is read from `?tenant=`, so every link keeps that part of the address.

## 3. Status pages (`components/StatusPage.tsx`)

One layout for every "can't open" case: a badge with the icon in the tone's colour, rings spreading out once from it, a title, one sentence, the address the customer opened, and "Bookings by TurfTap" at the bottom.

| Case | API reply | Tone | Icon | Action |
|---|---|---|---|---|
| Venue not found (`POR-01`) | 404 `tt_plt_001` | off (grey) | `MapPinOff` | none |
| Not available (`PLA-03`) | 403 `tt_plt_010` | watch (amber): it may come back | `CalendarOff` | none |
| Couldn't connect | anything else | bad (red) | `WifiOff` | Try again |

## 4. First load

Everything arrives in order, so the eye follows the page from the top down:

1. The top bar drops in (`tt-drop`), the tenant's square pops (`tt-pop`) and the name fades in.
2. The page title rises (`tt-rise`, 60ms later).
3. Cards rise one after another (`tt-card-in`, from 140ms, 70ms apart, first 9 only).
4. A card's photo area shimmers until the photo loads, then the photo fades and settles in.

Status pages: the badge pops, the rings spread, then the title, sentence, address and action rise 60ms apart.

## 5. Browsing and picking a time (T28)

The customer goes **venue → resource → day → how long → time → Book**, one choice per step, all by tapping.

| Page | Address | What it shows |
|---|---|---|
| Venues | `/` | One card per venue, cover photo first. The whole card is the link. |
| Venue | `/venues/$venueId` | Cover photo, name, address, then a card per resource with its price range ("LKR 4,500 – LKR 6,000 per hour", counting its Price Rules). |
| Resource | `/resources/$resourceId?date=` | A strip of days, then that day's slots. The chosen day is in the address, so Back keeps it. |
| Book | `/book` | A placeholder until sign-in (T29) and booking (T30). |

- **Day strip**: today and the next 30 days (D-06), on the venue's clock. The chosen day is solid teal. A Closed Date has a red dot and a struck-through number; a weekday the venue doesn't open is struck through. Arrows to scroll it appear from 640px.
- **Slots**: grouped into Morning, Afternoon and Evening, three across on phones and six on wide screens. Times are 12-hour ("6:30 PM"), which customers read more easily; the Staff Console keeps 24-hour. A free slot shows its time and its own price (a Price Rule's price where one applies). A taken slot is grey, struck through and can't be tapped. Slots that already started are left out. A pill says how many are free, or "Fully booked" in amber.
- **Picking**: each tile is a start time with the price of one slot. Tapping one opens it into a full-row teal block: start → end, the length, the server's total, × in the corner, − and + on the left and a white **Book** on the right. + adds one slot and the start times the block now covers merge into it; − lets them go. A line under the buttons says what + does, or why it is off: the time right after isn't free, or the online limit is reached (3 hours on courts, 2 on tables; Staff make longer bookings). + asks the server whether one more slot is free (`slots=` one and two more, so the answer is already there after a press); while it waits it looks ready but ignores presses, so it never flickers. × puts the block back as a tile. Tapping another tile moves the block there at one slot.
- **Book**: pressing it plays a short press: a light sweeps across the block, the button pulses and its arrow leaves and comes back, then the next page opens (at once with reduced motion).
- **Book bar**: rises from the bottom only while the block is scrolled out of view, with the times, the day, the total, × and Book, so there is never more than one Book on screen.
- **Merge motion**: picking, +, − and × run inside a View Transition (`lib/motion/viewTransition.ts`), which tags `<html data-glide>` with the kind of change. Each tile has its own `view-transition-name`, so tiles glide to new places, the tapped tile opens into the block, and merged tiles slide up into it. The top bar and the Book bar have names too and sit above the moving tiles. Taps go through during the motion. With reduced motion, or a browser without View Transitions, the change happens at once.
- **A day with nothing to pick** shows one panel instead of the slots: red "Closed" with the Closed Date's reason, grey "Not open on this day", or grey "No more times today".
- Changing day slides the new slots in from the side of the day picked.

## 6. Signing in (T29)

Sign-in comes only when it is needed: pressing **Book** on a time. One card, one question at a time, the field focused so the keyboard is already up.

1. **Phone** (teal phone tile): "What's your phone number?", one large phone field, **Continue**. An amber note says it is the test sign-in until real codes arrive (T42).
2. **Name** (pink person tile), only the first time this tenant sees the phone: "What's your name?", prefilled when the name is already known. Under it, the phone as people write it ("077 123 4567") and **Use another number**, which goes back to step 1.

Each step rises in as the last one leaves. Between them a quiet "Signing you in" line shows while the record is looked up. Afterwards the customer lands back on the page they came from, with their chosen time still in the address.
