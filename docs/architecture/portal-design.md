# Customer Portal design

How the Customer Portal looks and moves. It follows [console-design.md](console-design.md) (principles, colour meanings, motion vocabulary, loading rules) and shares its tokens from `packages/ui/src/theme.css`. This page lists only what is different for customers on a phone.

Status: written 2026-11-26 with T27 (the shell). Waiting for the user's approval on the running portal.

## 1. Phone first

- Designed at **360 px** wide, then widened. Content sits in one column on phones, at most `max-w-5xl` wide, with 16px side padding. Cards go two across from 640px and three from 1024px.
- Pages use `min-h-dvh`, so phone browser bars don't cut them off.

## 2. The shell (`layout/Shell.tsx`)

- **Top bar**: frosted (`tt-glass`), sticky, 64px tall. The tenant's initials on a teal square (`TenantMark`) and its name, which also becomes the browser tab's title. Pressing it goes home.
- **Pages open only once the tenant is known.** Until then the top bar and the page show skeletons shaped like what is coming. If the tenant can't be read, the whole page is replaced by a status page (§3), so no page ever shows its own "not found" toast.
- A soft teal wash behind the top of the page (`tt-canvas-glow`) is the brand; it never sits behind content.
- **Bottom nav** comes with the second page (T31).

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
