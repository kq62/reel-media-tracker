# Reel - Personal Media Tracker & Discovery Platform

A full-stack app for tracking what you watch, rating it, and discovering
what to watch next, built with Next.js (App Router), PostgreSQL, Prisma,
NextAuth, Tailwind, and the TMDB API.

This README is updated at the end of every phase. Right now it reflects
**Phase 1: project setup + authentication.**

## Tech stack

- **Next.js 16 (App Router)** — frontend pages + backend API routes in one project
- **TypeScript**
- **PostgreSQL** + **Prisma** — schema, migrations, type-safe queries
- **NextAuth.js v4** — session management (Credentials provider for now)
- **Tailwind CSS v4** — utility-first styling, CSS-based theme config

## What's built in Phase 1

- Project scaffolded with TypeScript, Tailwind, App Router, ESLint
- `User` model in Prisma (`prisma/schema.prisma`)
- Sign up: `POST /api/auth/signup` hashes the password with bcrypt and
  creates a `User` row
- Log in / log out: NextAuth Credentials provider, JWT sessions
- `/signup` and `/login` pages
- Session-aware navbar (`src/components/navbar.tsx`) and home page
  (`src/app/page.tsx`) — one reads the session client-side via
  `useSession()`, the other server-side via `getServerSession()`, to show
  both patterns

## Project structure

```
src/
  app/
    api/auth/[...nextauth]/route.ts   # NextAuth handler (signin/signout/session/jwt)
    api/auth/signup/route.ts          # custom registration endpoint
    login/page.tsx
    signup/page.tsx
    layout.tsx                       # fonts, theme, navbar, session provider
    page.tsx                         # home page
  components/
    auth/auth-card.tsx                # shared "ticket stub" card shell
    auth/form-field.tsx               # shared labeled input
    navbar.tsx
    providers/session-provider.tsx    # client wrapper around NextAuth's SessionProvider
  lib/
    auth.ts                          # NextAuthOptions (the actual auth config)
    prisma.ts                        # PrismaClient singleton
  types/
    next-auth.d.ts                   # adds `id` to Session/JWT types
prisma/
  schema.prisma
```

## Running it locally

### 1. Get a Postgres database

Easiest options:
- **Local**: install Postgres, then `createdb media_tracker`
- **Supabase**: create a project, copy the connection string from
  Project Settings → Database
- **Railway**: new project → Add PostgreSQL → copy the connection string

### 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in:
- `DATABASE_URL` — your Postgres connection string
- `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`
- `NEXTAUTH_URL` — `http://localhost:3000` for local dev
- `TMDB_API_KEY` — leave blank for now, used in Phase 2

### 3. Install dependencies and set up the database

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
```

`migrate dev` creates the `users` table and generates the type-safe
Prisma client used everywhere via `src/lib/prisma.ts`.

### 4. Run the dev server

```bash
npm run dev
```

Visit `http://localhost:3000`.

## How to test Phase 1

1. Go to `/signup`, create an account → you should land back on `/` already
   signed in (navbar shows your name + a Log out button).
2. Click **Log out** → navbar switches back to Log in / Sign up.
3. Go to `/login` and sign back in with the same credentials.
4. Try signing up again with the same email → should show
   "An account with that email already exists" instead of crashing.
5. Try logging in with a wrong password → should show "Incorrect email
   or password."
6. Optional: open Prisma Studio (`npx prisma studio`) and confirm the
   `users` table has your row with a bcrypt hash, not a plaintext
   password.

If all six behave as described, Phase 1 is solid.

---

## Phase 2: TMDB search, browse, and detail pages

### What's new

- **`src/lib/tmdb.ts`** — single wrapper around the TMDB API. Every TMDB
  call in the app goes through here (search, trending, detail-with-credits-
  videos-and-watch-providers in one request via `append_to_response`).
- **`/browse`** — trending movies/TV this week
- **`/search`** — debounced search box, results driven by the `?q=` URL
  param so searches are shareable/bookmarkable
- **`/movie/[id]` and `/tv/[id]`** — detail pages: synopsis, cast,
  trailer (YouTube embed), and "where to watch" by region
- **Region selector** — a dropdown of common regions (not full geolocation
  detection) on the detail page; the choice is stored in a cookie via
  `POST /api/region` and read server-side on subsequent visits

### New project structure

```
src/
  app/
    api/region/route.ts        # sets the region cookie
    browse/page.tsx
    search/page.tsx
    movie/[id]/page.tsx        # thin wrapper around MediaDetailPage
    tv/[id]/page.tsx           # thin wrapper around MediaDetailPage
  components/
    media-card.tsx             # poster card used in browse/search grids
    media-detail-page.tsx      # shared detail-page layout (movie + tv)
    cast-list.tsx
    trailer-embed.tsx
    watch-providers.tsx
    region-selector.tsx
    search-box.tsx
    empty-state.tsx
  lib/
    tmdb.ts                    # TMDB API client wrapper
    regions.ts                 # supported region list + cookie name
```

### Decisions worth being able to explain in an interview

- **One shared `MediaDetailPage` component for both movie and TV
  routes.** The two TMDB endpoints (`/movie/{id}` vs `/tv/{id}`) return
  almost identical shapes (`title` vs `name`, `release_date` vs
  `first_air_date`, `runtime` vs `episode_run_time`). Branching on those
  field-name differences inside one shared component avoided maintaining
  two near-duplicate pages.
- **`append_to_response` for the detail page.** TMDB lets you bundle
  `credits`, `videos`, and `watch/providers` into the same request as the
  base detail call, instead of four separate round trips for what's
  conceptually one page load.
- **Region is a cookie, not a `User` column.** It's a display preference
  with no real connection to identity — storing it in the database would
  mean a migration and a write on every region change for something that
  doesn't need to survive a cleared browser or be queried.
- **Search drives off the URL (`?q=`), not local component state alone.**
  The actual TMDB fetch happens in an async Server Component reading
  `searchParams`; the `SearchBox` is a small Client Component that
  debounces typing and pushes the URL. That keeps results server-rendered
  (no client-side loading flash on first paint) while still being
  interactive, and makes a search shareable as a link.
- **TMDB responses are cached for an hour** (`next: { revalidate: 3600 }`
  in `tmdb.ts`). Trending lists and cast/provider data don't change
  minute-to-minute, so there's no reason to hit TMDB fresh on every page
  load — this also keeps us comfortably under the free-tier rate limit.

### Running it locally

You'll need a TMDB API key in addition to the Phase 1 setup:

1. Create a free account at themoviedb.org → **Settings → API** → request
   a key (Developer tier)
2. Add it to `.env`:
   ```
   TMDB_API_KEY="your-key-here"
   ```
3. `npm run dev` (same as before)

### How to test Phase 2

1. Go to `/browse` → should show a grid of currently trending titles
2. Go to `/search`, type a title (e.g. "Inception") → results should
   appear after a brief pause as you stop typing
3. Click any result → should land on its detail page with poster,
   synopsis, cast photos, and (if available) an embedded trailer
4. On the detail page, change the region dropdown → the "where to watch"
   section should update for that region after the page refreshes
5. Search for something with no matches (e.g. "asdkfjasdf") → should show
   the "No results" empty state instead of an error
6. Temporarily comment out `TMDB_API_KEY` in `.env`, restart the dev
   server, and reload `/browse` → should show the "unavailable right now"
   empty state instead of crashing the page

If all six work, Phase 2 is solid.

---

## Phase 3: watchlist, ratings, and the dashboard

### What's new

- **Schema**: three new models — `Title` (a local cache of TMDB metadata
  so the dashboard never has to call TMDB per row), `WatchlistItem`
  (planned/watched status), `Rating` (1-10 score)
- **`POST/PATCH/DELETE /api/watchlist`** — add a title, toggle
  planned↔watched, remove
- **`POST/DELETE /api/ratings`** — rate (or re-rate) a title 1-10, remove
  a rating
- **Watchlist button** on every detail page (`+ Add to Watchlist` →
  `Planned` → `Mark as Watched` → `✓ Watched`, plus Remove)
- **Quick-add button** (a small `+` overlay) on every poster card in
  search/browse results — adds straight to the watchlist without leaving
  the grid
- **Rating control** on every detail page — click 1-10 to rate
- **`/dashboard`** — your planned watchlist, your ratings history, and a
  most-watched-genres bar chart, all auth-gated (redirects to `/login` if
  signed out)

### New project structure

```
src/
  app/
    api/watchlist/route.ts       # POST add, PATCH status, DELETE remove
    api/ratings/route.ts         # POST upsert rating, DELETE remove
    dashboard/page.tsx
  components/
    watchlist-button.tsx         # full controls — detail page
    watchlist-quick-add-button.tsx  # add-only — poster cards
    rating-control.tsx           # 1-10 click-to-rate
    dashboard/
      dashboard-item-row.tsx     # poster + title + slot for controls
      genre-stats-bars.tsx
  lib/
    titles.ts                    # ensureTitleCached() — canonical TMDB→DB cache writer
    user-media-state.ts          # looks up the signed-in user's status/rating for a title
    genre-stats.ts               # pure frequency-count helper for the dashboard stat
```

### Decisions worth being able to explain in an interview

- **The server re-fetches title metadata from TMDB rather than trusting
  the client.** Both `/api/watchlist` and `/api/ratings` call
  `ensureTitleCached()`, which only ever takes a `{ tmdbId, mediaType }`
  pair from the request — never a client-supplied title/poster/genre
  payload. That keeps the cache trustworthy (a malicious or buggy client
  can't write fake data into it) and means the quick-add button on a
  poster card and the full button on a detail page can call the exact
  same endpoint with the exact same minimal payload.
- **Rating a title auto-marks it watched.** `/api/ratings` upserts a
  `watched` `WatchlistItem` in the same database transaction as the
  rating. Conceptually you can't rate something you haven't watched, so
  this lets a user rate directly from a detail page without a separate
  "add to watchlist" step first — one fewer click for the common case.
- **The watchlist quick-add button only adds, never removes or shows
  current status.** Showing accurate state on every card in a 20-item
  grid would mean a watchlist-status query per card (or one big query
  joined client-side) just for a "+" button. Full control — mark
  watched, remove — lives on the detail page, where that lookup is
  already a single query per page load, not N of them.
- **`(tmdbId, mediaType)` as a composite key, never `tmdbId` alone.**
  TMDB doesn't scope ids globally — movie #550 and TV show #550 are
  unrelated titles. Every model that references a title uses the pair
  together as a compound unique constraint, both in `Title`'s primary
  key and in `WatchlistItem`/`Rating`'s per-user uniqueness constraint.
- **Genres are a denormalized `String[]` on `Title`, not a normalized
  `Genre` table with a join table.** This cache exists purely for display
  and for one aggregate stat (most-watched genres) — it's not a source
  of truth callers query relationally, so the normalization that would
  matter in a transactional system isn't earning its complexity here.

### Running it locally

New migration needed — same `.env` as Phase 2, no new environment
variables.

```bash
npx prisma migrate dev --name add_watchlist_and_ratings
npm run dev
```

### How to test Phase 3

1. From `/browse` or `/search`, click the `+` button on a poster card →
   it should turn into a checkmark
2. Go to `/dashboard` → that title should appear under "Watchlist"
3. Open the title's detail page → the watchlist button should read
   "Planned" (matching step 1), with a "Mark as Watched" option
4. Click "Mark as Watched" → button updates to "✓ Watched"
5. Scroll to "Your rating", click a number 1-10 → it should highlight
   immediately
6. Go back to `/dashboard` → the title should now appear under "Ratings"
   with that score, and "Most-watched genres" should reflect its genres
7. On the dashboard, click "Clear rating" on that item → it disappears
   from the Ratings section (its watched status on the watchlist is
   untouched)
8. Log out and visit `/dashboard` directly → should redirect to `/login`
   instead of erroring
9. While logged out, click the `+` quick-add button on a card → should
   redirect to `/login` instead of silently failing

If all nine work, Phase 3 is solid and the core feature set (auth,
search/browse, detail pages, watchlist, ratings, dashboard) is complete
end to end.

---

## Post-Phase-3 additions: star ratings, reviews, and catalog rows

These three came in as follow-up requests after the original spec's
core features were done, so they're documented separately rather than
folded into "Phase 3" above.

### What's new

- **Quarter-star ratings.** Ratings moved from a 1-10 integer to a
  0.25-5.0 float (Letterboxd-style precision, but quarter-star instead
  of half-star). `RatingControl` was rebuilt around a custom star
  widget: two identically-laid-out rows of star icons — a muted outline
  row, and an accent-filled row clipped to a percentage — so the whole
  control only needs one number (the fill %) instead of five separate
  per-star calculations.
- **Written reviews.** `Rating` gained an optional `comment` field.
  Comments are gated behind having a score first — there's no concept
  of an unrated review, so the "Add a review" control only appears once
  a star value is set.
- **Catalog rows.** The home page now shows several horizontally-
  scrolling, Netflix-style rows (Trending, Popular Movies, Top Rated,
  Popular TV, Action, Comedy, Horror) instead of a bare hero — this is
  also what makes the home page "scroll for more": instead of paginating,
  each row scrolls independently and there are several of them stacked.

### New/changed files

```
src/
  components/
    icons/star-icon.tsx       # shared 5-point star SVG path
    rating-control.tsx        # rebuilt: star widget + review textarea
    catalog-row.tsx           # one horizontally-scrolling poster row
  lib/
    catalogs.ts                # CATALOGS config — title + TMDB fetcher per row
  app/page.tsx                 # rebuilt around CatalogRow instead of static text
```

`src/lib/tmdb.ts` gained `getMediaList()` — a generic helper for
single-media-type list endpoints (`/movie/popular`, `/tv/top_rated`,
`/discover/movie?with_genres=...`), since those don't include a
`media_type` field on each result the way `/search/multi` and
`/trending/*` do.

### Decisions worth being able to explain in an interview

- **Quarter-star precision via one clip percentage, not five per-star
  calculations.** The star widget is two `<div>`s with identical flex
  layouts stacked on top of each other — a full row of outline stars
  underneath, and a row of accent-filled stars on top inside a container
  whose `width` is set to `(value / 5) * 100%` with `overflow: hidden`.
  Because both rows share the exact same gap/sizing, clipping the top
  row at any percentage reveals a precisely proportional amount of
  filled stars — there's no need to compute each star's individual fill
  state. The fill amount is derived from cursor position during hover
  (`onMouseMove`) and read directly from the click position to commit.
- **A comment can't exist without a score.** Rather than two independent
  fields, `comment` is conceptually subordinate to `score` in both the
  schema's intent and the UI — the "Add a review" control simply doesn't
  render until `score !== null`. This avoids a half-finished state
  (a review with no rating attached) that would need its own handling
  everywhere ratings are displayed.
- **The home page calls TMDB seven times and tolerates partial
  failure.** `Promise.allSettled` (not `Promise.all`) means if one
  catalog's request fails — a transient TMDB hiccup, a bad genre id —
  the rest of the rows still render. A `Promise.all` would have meant
  one flaky row blanking the entire home page.
- **Catalogs live on the home page, `/browse` stays a flat grid.**
  Two different jobs: the home page is for discovery/browsing momentum
  (several curated angles, low commitment, swipe past what doesn't
  interest you), `/browse` is for "show me everything trending right
  now" in one scannable view. Conflating them into one mega-page would
  have made both jobs worse.

### Running it locally

New migration (changes the `ratings` table's `score` column type and
adds `comment`):

```bash
npx prisma migrate dev --name add_star_ratings_and_comments
npm run dev
```

Existing rating rows from before this change are part of the same
reset — you'll be asked to confirm a schema reset.

### How to test

1. Open any title's detail page → the rating section should now show
   five outline stars
2. Hover across them → they should fill in smoothly in quarter
   increments as you move, not jump in whole-star steps
3. Click partway through a star → confirm the score under the stars
   reads something like "3.25 / 5", not a whole number
4. A "+ Add a review" link should now be visible → click it, type a
   sentence, **Save review** → it should appear as an italicized quote
   below the stars
5. Refresh the page → both the star fill and the review text should
   persist
6. Go to `/dashboard` → the same title should appear under Ratings with
   a smaller version of the same star widget and the review visible
7. Go to the home page (`/`) → you should see several horizontally-
   scrolling rows (Trending, Popular Movies, Action, etc.); try
   scrolling one sideways on both desktop (mouse wheel/trackpad) and,
   if you can, a phone (touch swipe)
8. Click the quick-add `+` button on a poster inside one of the home
   page rows → same behavior as on `/browse` or `/search`

---

## Design revision: layout width, accent color, and polish

A round of feedback after the features above landed: the page felt too
narrow on a laptop screen, the dashboard rows were cramped, the star
widget and catalog rows needed more visual polish, the accent color
should read as orange (not gold), and `/browse` needed a way to filter
by genre.

### What changed

- **Page width**: the main container went from `max-w-5xl` (1024px) to
  `max-w-[1440px]` — on a typical laptop screen this is the difference
  between large empty margins and the page actually using the available
  width. Grids on `/browse` and `/search` gained `xl`/`2xl` breakpoints
  to take advantage of it.
- **Accent color**: `--color-accent` moved from a gold/amber
  (`#f2a33c`) to a vivid true orange (`#ff7a29`). Everything that reads
  the token (buttons, the star widget, active filter pills, link hovers)
  updated automatically — no component-level color changes needed,
  which is the whole point of driving color from CSS variables instead
  of hardcoding it per component.
- **Dashboard cards**: `DashboardItemRow` went from a thin horizontal
  strip (a 56px-tall poster squeezed against cramped controls) to a
  proper card with a real poster size, sitting in a responsive grid
  (`grid-cols-1 sm:grid-cols-2 xl:grid-cols-3`) instead of one
  full-width vertical stack.
- **Star widget**: bigger stars, a smooth width transition on the fill
  (instead of jumping instantly), a subtle orange glow while hovering,
  and the numeric score given more visual weight (bold, larger) instead
  of being the same muted gray as everything around it.
- **Catalog rows**: bigger poster cards, a subtle lift-on-hover, edge
  fade gradients hinting that a row continues past the visible edge,
  and hover-revealed left/right scroll buttons for mouse/trackpad users
  (touch devices already get native swipe, so the buttons only show on
  `sm:` and up).
- **Genre stats**: replaced the bar chart with a chip cloud
  (`GenreStatsCloud`). This is the real fix for "why is everything
  showing 1" — it's not a bug, a small or genre-varied watch history
  legitimately produces lots of ties at 1, and a bar chart makes ties
  look broken (identical-length bars). A chip cloud doesn't have that
  problem, and only highlights a "leading" genre once there's real
  separation in the data (`max > 1`) rather than arbitrarily
  spotlighting one of several tied genres.
- **Genre filtering on `/browse`**: a row of genre pills
  (`GenreFilterBar`) above the grid. Picking one switches the page from
  "trending" to "popular movies in this genre" via TMDB's
  `/discover/movie?with_genres=...` endpoint. Implemented as plain
  links updating a `?genre=` URL param — no client-side JavaScript
  needed for the filtering itself, which keeps it simple, fast, and
  bookmarkable, consistent with how `/search` already uses `?q=`.

### New/changed files

```
src/
  app/browse/page.tsx              # now reads ?genre=, branches trending vs discover
  components/
    genre-filter-bar.tsx           # plain Link-based pills, no client JS
    catalog-row.tsx                 # now "use client" — scroll buttons need a ref
    dashboard/
      dashboard-item-row.tsx        # rebuilt as a card, not a thin row
      genre-stats-cloud.tsx         # replaces genre-stats-bars.tsx
  lib/
    genres.ts                       # shared TMDB movie genre id/name list
```

### Decisions worth being able to explain in an interview

- **Color lives in one place.** Changing the accent hue touched exactly
  one line in `globals.css` — every button, active state, and glow
  effect across the app picked it up automatically because nothing
  hardcodes a hex value; everything reads `var(--color-accent)` via
  Tailwind's theme tokens. This is the payoff of setting up design
  tokens early instead of sprinkling color values through components.
- **The genre filter needs zero client-side JavaScript.** Each pill is
  a real `<a>` tag (via Next's `Link`) pointing at `/browse?genre=28`.
  Clicking it is a normal navigation; the server component re-reads the
  URL and fetches accordingly. No `useState`, no `onClick` handlers, no
  hydration cost for something that's fundamentally just "go to a
  different URL" — a good reminder that not every interactive-looking
  UI element needs to be a Client Component.
- **The "leading genre" highlight only appears with real separation.**
  Marking an arbitrary tied genre as your "favorite" when everything is
  tied at 1 would be actively misleading, not just a cosmetic miss — so
  `GenreStatsCloud` checks `max > 1` before applying the highlighted
  style. The bug-shaped complaint ("why is everything 1") turned into a
  legitimate design rule, not just a visual reskin.

### Follow-up: longer catalog rows

Each catalog/browse row was capped at TMDB's default page size (20
items) — fine for the grid, but thin for a horizontally-scrolling row
you could exhaust in a couple of swipes. `getTrending()` and
`getMediaList()` in `tmdb.ts` now accept an optional `pageCount`: they
fire that many TMDB page requests in parallel (`page=1`, `page=2`, ...)
and merge the results, deduped by id. Catalog rows request 3 pages
(~60 titles); `/browse` requests 5 (~100), since it's the dedicated
full-browsing destination rather than a teaser row. This is a fixed,
bounded amount — not true infinite-scroll pagination, which would need
its own loading state and scroll-position tracking for not much benefit
on a portfolio project's media-browsing page.

### Follow-up: hover clipping fix + richer card interaction

Hovering a poster inside a catalog row was getting visually clipped at
the top — the card would lift on hover but the top portion looked cut
off. The cause: the row's scroll container sets `overflow-x: auto` but
never touches `overflow-y`, and per the CSS spec, leaving one axis at
its default `visible` while the other is anything else makes the
browser compute the `visible` one as `auto` too. So the container was
silently clipping vertically the whole time, and the hover lift
(`translate-y`) only made it visible by moving the card into the
clipped zone. Fixed with `pt-3 pb-3` on the scroll container, giving
the lift room to render without crossing the (now effectively
invisible) clip boundary.

While fixing that, the hover interaction itself moved from a one-off
`hover:-translate-y-1` on the catalog row's wrapper into `MediaCard`
directly (lift + slight scale + a warm accent-tinted shadow), so every
poster gets the same richer hover state — including `/browse` and
`/search`, which previously had no hover motion at all, just a border
color change.

### Follow-up: star centering, half-star, animations, and "Show more"

Four polish items in one round.

**Star centering.** Even after switching to a two-halves-per-star DOM
approach, hovering the visual center of a star sometimes filled the
wrong amount — the drift was worst on the second and fourth stars,
zero at the middle. Root cause: the outline row, fill row, and
interactive row all had `gap-1.5` between stars, but the "gap space"
between two stars isn't inside either star's clickable slot, so a
cursor over the gap did the wrong thing and the fill percent didn't
map linearly to star boundaries. Fix: all three layers now use `gap-0`
and rely on the star SVG's natural internal padding for visual
separation. Now the fill percent maps exactly to star positions
(`score 2.5 → 50% width → exactly half of the third star`), and the
interactive halves line up 1:1 with the visual halves.

**Half-star (not quarter).** The precision is `STEP = 0.5` in
`rating-control.tsx` and validated as such in `/api/ratings/route.ts`
(Zod `refine` on `score * 2` being a whole number). Ten possible values
(0.5, 1, 1.5, ..., 5), matching the Letterboxd standard.

**Route transitions.** A new `src/app/template.tsx` wraps every page in
a container with a `page-enter` CSS animation (a subtle 250ms fade-up
on mount). `template.tsx` is a Next.js built-in convention that
re-mounts on every route change (unlike `layout.tsx`, which persists),
so a plain CSS `@keyframes` runs on every navigation — no client-side
animation library needed for something this simple.

**Scroll-driven poster reveals.** Posters in catalog rows and the
browse grid fade + rise into view as they scroll into the viewport,
using `animation-timeline: view()` in CSS (a modern feature; degrades
to no animation in browsers without support, which is a perfectly fine
fallback state). No IntersectionObserver, no client-side JS.

**Catalog scroll amount.** Instead of a fixed 600px per arrow click
(which felt either barely-there or overshooting depending on screen
size), the buttons now scroll ~90% of the container's own visible
width — one "page" of visible cards at a time, with a bit of overlap
so the edge card stays partly visible for continuity.

**"Show more" pagination on `/browse`.** Instead of one hardcoded
5-page fetch, `/browse` reads a `?pages=N` URL param (default 2, max
10) and asks TMDB for that many pages. "Show more" is a plain `<Link
scroll={false}>` that doubles the page count in the URL — the whole
thing stays a Server Component with no `useState`, no infinite-scroll
observer, and full bookmarkability of any depth. Once the max is
reached, a small "everything popular in this list right now" note
appears in place of the button.

**Reduced-motion respect.** Every animation added here (`page-enter`,
`poster-reveal`, `poster-reveal-x`, `animate-fade-in`) is silenced by
a `@media (prefers-reduced-motion: reduce)` block in `globals.css` —
anyone with vestibular sensitivity has that OS setting on for a
reason, and no amount of visual delight is worth overriding it.







### Follow-up: half-star ratings, Show More pagination, scroll animations

Four related requests in one round:

- **Ratings switched from quarter-star to half-star** (Letterboxd
  standard). The API validator now enforces multiples of 0.5 with
  epsilon tolerance for floating-point drift, and the display formatter
  drops the trailing zero (`.5` shows, `.0` doesn't).
- **The star-centering bug is fixed properly** — not by measuring the
  SVG's transparent padding and correcting for it (fragile), but by
  restructuring the widget so each half of each star is its own real
  DOM element with an `onMouseEnter`/`onClick`. Which value the cursor
  corresponds to is now a DOM question, not a pixel-math question, so
  the visual center of a star and its interactive center are the same
  thing by construction.
- **`/browse` gained "Show more" pagination.** Pagination state lives
  in the URL (`?pages=2`), not client state, so the page stays a
  Server Component — the "Show more" button is just a plain `<Link>`
  that doubles the page count. Bookmarkable, refresh-safe, no client
  fetching code. Starts at 2 pages, doubles each click, capped at 10
  (~200 titles) to keep TMDB request counts reasonable.
- **Scroll-driven poster animations** using the modern CSS
  `animation-timeline: view()` — posters fade and lift into view as
  they enter the viewport (vertical for `/browse` and `/search`,
  horizontal for the catalog rows). No JS, no library — the browser
  drives the animation from actual scroll position. Chrome/Edge/Opera
  ship it today; browsers without support (Safari, older Firefox) just
  see the posters appear instantly, which is a perfectly fine
  degraded state. Everything is disabled under
  `prefers-reduced-motion: reduce`.

#### Decisions worth being able to explain in an interview

- **The star-centering fix is a design decision, not just a
  calculation.** Adjusting the pixel-math to account for the SVG path's
  transparent padding would have worked for this particular star icon —
  but the moment someone swapped the icon (say, for a different star
  shape or an emoji), the math would silently be wrong again. Making
  each half its own DOM element means the click target *is* what the
  user sees; there's no gap between the two that can drift out of sync.
- **URL-driven pagination beats client-side pagination for this shape
  of feature.** "Show more" doesn't need optimistic updates or partial
  hydration; it needs to load more items and render them. Making the
  button a `<Link href="?pages=4">` gets pagination for free from the
  Next.js router — no useState, no useEffect, no fetch on the client,
  and the page stays bookmarkable and refresh-safe. Would revisit if
  scroll-position preservation mattered, but for this UX it doesn't.
- **`animation-timeline: view()` over an IntersectionObserver-based
  library.** For scroll-driven fade-ins, the modern CSS approach means
  no JavaScript running per-scroll-frame at all — the browser drives
  it on the compositor. Support isn't universal yet (Safari, older
  Firefox), so this is a *progressive enhancement*: the CSS is wrapped
  in `@supports (animation-timeline: view())` and unsupported browsers
  simply skip the animation. A library-based approach would have added
  weight and a scroll listener for the same visual result.
