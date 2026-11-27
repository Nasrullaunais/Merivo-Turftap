# Customer Portal design

How the Customer Portal looks and moves. It follows [console-design.md](console-design.md) (principles, colour meanings, motion vocabulary, loading rules) and shares its tokens from `packages/ui/src/theme.css`. This page lists only what is different for customers on a phone.

Status: written 2026-11-26 with T27 (the shell), approved. §5 added with T28, approved. §6 added with T29, approved. §7 added with T30, approved. §8 and the nav in §2 added with T31, approved. §9 added with T32, approved.

## 1. Phone first

- Designed at **360 px** wide, then widened. Content sits in one column on phones, at most `max-w-5xl` wide, with 16px side padding. Cards go two across from 640px and three from 1024px.
- Pages use `min-h-dvh`, so phone browser bars don't cut them off.

## 2. The shell (`layout/Shell.tsx`)

- **Top bar**: frosted (`tt-glass`), sticky, 64px tall. The tenant's initials on a teal square (`TenantMark`) and its name, which also becomes the browser tab's title. Pressing it goes home.
- **Pages open only once the tenant is known.** Until then the top bar and the page show skeletons shaped like what is coming. If the tenant can't be read, the whole page is replaced by a status page (§3), so no page ever shows its own "not found" toast.
- A soft teal wash behind the top of the page (`tt-canvas-glow`) is the brand; it never sits behind content.
- **Sections** (`POR-05`): **Venues** and **My bookings**. On phones they sit in a frosted bottom nav, icon over label; from 640px they move into the top bar as a pill switch. A teal tint (phones) or a white pill (wider) slides to the current one. A booking's own page counts as My bookings. Bars pinned to the bottom, like the Book bar, sit above the bottom nav (`--tt-nav-space`).
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
| Book | `/book` | The confirm step (§7). |

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

## 7. Booking and paying (T30)

After **Book** the customer goes **confirm → transfer → send the receipt**, one page each, nothing typed.

| Page | Address | What it shows |
|---|---|---|
| Confirm | `/book?resourceId=&startsAt=&count=` | "Check your booking": the ticket, then a card with the price bar, the steps and one **Confirm booking**. Side by side from `lg`. |
| Booking | `/bookings/$bookingId` | How to pay while the booking waits for payment; afterwards, where it stands. T31's "send receipt" opens this page too. |

- **Ticket** (`components/BookingTicket.tsx`): what is booked, drawn as a ticket. The resource's cover photo on top when it has one; the resource tile, name and venue; a calendar leaf for the day (month on a teal band, the date big, the weekday under it); the start and end times big ("10:00" with a small "AM"), joined by a teal bar with one piece per slot and the length above it. A torn edge with two notches, then a stub with the customer's initial and name, and on the Booking page the state as a pill in its tone. Both pages use it.
- **Price bar**: the price big, then one bar split by what is paid when: a purple part with the share ("50%") for now, a grey striped part for at the venue (all green with a shop icon at a Pay at Venue venue). Under it **Pay now** and **At the venue** with their amounts; the one the customer acts on is big and coloured, the other quiet. The amount uses `amountDueOnline()` from the contract, the same rule as the API.
- **Steps** (`components/Journey.tsx`): dots joined by a line, **Confirm → Transfer → Receipt → Booked** (Pay at Venue: **Confirm → Booked → Pay there**). Done steps are teal with a tick and a solid line; the current one is filled in its colour and breathes softly; later ones are outlined with a dashed line. Transfer carries an amber pill with the Payment Time Limit ("24 hours"). The confirm card shows them with Confirm current; the Booking page with Transfer current, then Booked "Checking" in blue, then all done.
- **Time gone**: if the time is no longer free (when the page opens or when Confirm is pressed), the customer goes back to the time list on the same day, and a red "That time isn't free any more" panel shakes in under the resource's name. The time list asks the server again.
- **One booking waiting already**: Confirm is replaced by an amber panel with **Open that booking**.
- **Waiting for payment**: a ring counting down the Payment Time Limit ("18:42", or "23h" over "59m" for long limits), amber, red in the last 5 minutes. Beside it "Send LKR 4,500 to confirm" and the deadline on the venue's clock ("By 4:34 PM, Fri 27 Nov"). Then the steps, then one card per step, each wearing its dot's icon on a purple tile:
  1. **Transfer the money**: the amount on a light purple row, then the bank details drawn as a purple bank card: bank and branch, the account number big and spaced, the account name. Every line copies itself with one tap (the account number and amount as digits only); a "Copied" tick pops in. With no bank details, an amber line gives the venue's phone.
  2. **Send the receipt**: a dashed purple drop zone ("Choose your receipt", JPG, PNG or PDF up to 5 MB) that also takes a dropped file. A wrong type or a file over 5 MB is refused before upload, in red, with a shake. A good file shows large above its name, with × and **Send receipt**.
  From `lg` the ticket sits in a sticky column beside the steps; on phones it comes last.
- **Afterwards** the page shows one panel in the state's tone and icon, as the console's (§3.3 of console-design.md), with rings spreading from the badge: blue "Receipt sent" (the venue checks it), green "You're booked" (with "Pay LKR 9,000 at the venue." when money is left), grey "The time to pay ran out" with **Book again**, grey "This booking was cancelled". The steps (for "Receipt sent" and "You're booked") and the ticket sit under it. When the countdown reaches zero the page turns to "ran out" at once and asks the server again.

## 8. My bookings (T31)

| Page | Address | What it shows |
|---|---|---|
| My bookings | `/me?show=upcoming\|past\|memberships` | A switch, then one list. Signing in comes first. |

- **Switch**: **Upcoming**, **Past** and **Memberships**, each as wide as its label, with a white pill that slides to the chosen one. Upcoming and Memberships carry a teal count (live bookings, active memberships). Memberships shows only when a venue has a gym or the customer has one. The choice is in the address, so Back keeps it.
- **Booking card**: the calendar leaf, the resource's icon and name, the venue, "6:00 PM – 8:00 PM · 2 hours" and the state pill (beside the name from 640px, under the time on phones). The top part opens the booking's page. Under a dashed line, what the customer can do now:
  - Waiting for payment: the time left to pay (amber, red in the last 5 minutes), **Cancel** and a purple **Send receipt**, which opens the booking's page (§7).
  - Waiting for receipt check: a blue "The venue is checking your receipt" and **Call** with the venue's phone.
  - Confirmed: green "Paid" or purple "LKR 4,500 to pay at the venue", then "Free to cancel until 6:00 PM, Sun 29 Nov" and **Cancel**. After the Cancellation Cut-off the line says why it can't be cancelled here and **Call** replaces Cancel (`BKG-06`).
  - Started, cancelled, expired and past bookings have no footer.
- **Cancel**: a red question folds open inside the card: "Cancel this booking?", that the time goes back for others, what was paid ("Any refund is arranged with the venue"), **Keep it** (focused) and **Yes, cancel**. When it lands, the card glides down to **Cancelled or expired**, a quiet group at the end of Upcoming. If the server refuses, its message shows as a toast and the list reloads.
- **Past** loads 20 at a time, latest first, with **Show older bookings**.
- **Membership card**: the plan on a membership tile, the venue, "Thu 26 Nov → Fri 25 Dec" and the state pill; an active one has the days-used bar and "29 days left" (amber from 3 days left, as in the console). The top part opens the membership's page (§9). Under a dashed line: waiting for payment has the time left, **Cancel** (the same red question, "Cancel this membership?") and **Send receipt**; waiting for receipt check says so; active has "Renew now and the next one starts Sat 26 Dec." and an orange **Renew**, or "Next one starts …" once renewed, or "Renew it at the desk" at a Pay at Venue venue (`MEM-04`).
- Empty lists show one panel with an icon; Upcoming offers **See venues**.

## 9. Buying and renewing a membership (T32)

The customer goes **venue → plan → start day → Buy → transfer → send the receipt**, all by tapping.

| Page | Address | What it shows |
|---|---|---|
| Venue | `/venues/$venueId` | Under the resources, **Gym memberships**: one card per plan on sale, with the price and length ("LKR 6,000 · 1 month"). A gym with nothing to rent shows only these. |
| Buy | `/plans/$planId?startsOn=` | "Start your membership": the start day, the membership drawn as a ticket, then a card with the price, the steps and **Buy membership**. Side by side from `lg`. Signing in comes first. |
| Membership | `/memberships/$membershipId` | How to pay while it waits for payment; afterwards, where it stands. Counts as My bookings in the nav. |

- **Start day**: the day strip from §5, today and the next 30 days, today picked. The chosen day is in the address, so Back keeps it.
- **Ticket** (`components/MembershipTicket.tsx`): the plan on an orange membership tile and the venue, then two calendar leaves, **From** and **To**, joined by an orange bar with the days it covers ("30 days"). The stub has the customer's name and, on the Membership page, the state. Picking another day pops the leaves to the new dates. The last day uses `membershipLastDay()` from the contract, the same rule as the API (D-28).
- **Steps**: **Buy → Transfer → Receipt → Active**, with the Payment Time Limit on Transfer. A membership is always paid in full by transfer.
- **Renewing** (`MEM-04`): with an active membership of the same plan, the title is "Renew your membership" and the day strip is replaced by "Starts Sat 26 Dec: the day after your current one ends, so there's no gap." **Renew** on the My bookings card opens this page.
- **Instead of Buy**: an amber "This membership is waiting for payment" (blue "The venue is checking your receipt" while checked) with **Open that membership**, since one customer can't hold the same plan twice. At a Pay at Venue venue the plan cards carry a grey "Buy at the desk" pill and don't open, and the Buy page says "Buy this at the desk" (OQ-03).
- **Membership page**: the same pay steps as §7, with the membership's ticket beside them. Afterwards one panel: blue "Receipt sent", green "Your membership is active" with its dates, grey "The time to pay ran out" or "This membership has ended" with **Buy again**, grey "This membership was cancelled".
