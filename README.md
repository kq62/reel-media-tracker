# 🎬 Reel — Personal Media Tracker & Discovery Platform

Reel is a full-stack app for keeping track of what you watch, rating it, and finding what to watch next. It's built with Next.js (App Router), PostgreSQL, Prisma, NextAuth, Tailwind, and the TMDB API.

This README is written like a build log — it grew phase by phase as I added features, and I kept it that way on purpose. It's basically my own study notes: everything I'd want to remember before explaining this project in an interview, in plain language, with nothing skipped.

## 🧱 Tech stack

- **Next.js 16 (App Router)** — one project handles both the frontend pages and the backend API routes
- **TypeScript**
- **PostgreSQL** + **Prisma** — the schema, migrations, and type-safe database queries
- **NextAuth.js v4** — handles login sessions (using the Credentials provider)
- **Tailwind CSS v4** — utility-first styling, with the theme set up through CSS

---

## 🚀 Phase 1: project setup + authentication

### What I built

- Set up the project with TypeScript, Tailwind, App Router, and ESLint
- A `User` model in Prisma (`prisma/schema.prisma`)
- Sign up: `POST /api/auth/signup` hashes the password with bcrypt and creates a `User` row
- Log in / log out through NextAuth's Credentials provider, using JWT sessions
- `/signup` and `/login` pages
- A navbar that knows if you're logged in (`src/components/navbar.tsx`) and a home page (`src/app/page.tsx`) — I deliberately made one check the session on the client side with `useSession()` and the other check it on the server side with `getServerSession()`, just so I'd have a working example of both patterns

### Project structure

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

### 🧠 Why I made these choices (interview prep)

- **I used NextAuth v4, not the v5 beta.** v5 (Auth.js) is nicer to work with in the App Router, but it had been in beta for a long time. Auth is one of those things where I'd rather use the boring, stable, fully-documented version than a beta API.
- **Sessions are JWTs, there's no database adapter.** With the Credentials provider there's no OAuth handshake, so there's nothing for a database adapter to save. That means the session lives in a signed cookie instead of a database row — which is also why the schema doesn't have `Session`/`Account` tables. If I ever add Google or GitHub sign-in later, that's the point where I'd bring in `@next-auth/prisma-adapter` and those tables.
- **Signup is its own hand-written API route.** NextAuth only handles signing *in* — it has no built-in idea of "create an account." So `/api/auth/signup` does the validation (Zod), hashes the password (bcrypt), and inserts the user. Right after that, the signup page calls NextAuth's `signIn()` automatically, so the person doesn't have to type their new password a second time just to log in.
- **There's one shared Prisma client (`src/lib/prisma.ts`).** In development, Next.js hot-reloads files every time you save, which would normally spin up a brand-new `PrismaClient` (and a new connection pool) on every single save. Storing the instance on `global` keeps it alive across reloads in dev. In production this doesn't matter — each serverless function gets its own scope anyway — so it's a no-op there, just a safety net for local dev.

### 🛠️ Running it locally

#### 1. Get a Postgres database

Pick whichever is easiest:
- **Local**: install Postgres, then `createdb media_tracker`
- **Supabase**: create a project, copy the connection string from Project Settings → Database
- **Railway**: new project → Add PostgreSQL → copy the connection string

#### 2. Set your environment variables

```bash
cp .env.example .env
```

Fill in:
- `DATABASE_URL` — your Postgres connection string
- `NEXTAUTH_SECRET` — generate one with `openssl rand -base64 32`
- `NEXTAUTH_URL` — `http://localhost:3000` for local dev
- `TMDB_API_KEY` — leave this blank for now, it's needed starting Phase 2

#### 3. Install dependencies and set up the database

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
```

`migrate dev` creates the `users` table and generates the type-safe Prisma client that gets used everywhere via `src/lib/prisma.ts`.

#### 4. Run the dev server

```bash
npm run dev
```

Then visit `http://localhost:3000`.

### ✅ How to test Phase 1

1. Go to `/signup`, create an account → you should land back on `/`, already signed in (navbar shows your name and a Log out button)
2. Click **Log out** → navbar switches back to Log in / Sign up
3. Go to `/login` and sign back in with the same details
4. Try signing up again with the same email → should show "An account with that email already exists" instead of crashing
5. Try logging in with the wrong password → should show "Incorrect email or password"
6. Optional: open Prisma Studio (`npx prisma studio`) and check that the `users` table shows a bcrypt hash, not a plain-text password

If all six of those work, Phase 1 is solid.

---

## 🔍 Phase 2: TMDB search, browse, and detail pages

### What's new

- **`src/lib/tmdb.ts`** — one wrapper around the TMDB API that every TMDB call in the app goes through (search, trending, and a detail request that grabs cast, videos, and watch providers all at once via `append_to_response`)
- **`/browse`** — trending movies and TV shows for the week
- **`/search`** — a debounced search box; results are driven by the `?q=` URL param so a search is shareable and bookmarkable
- **`/movie/[id]` and `/tv/[id]`** — detail pages with synopsis, cast, a trailer (YouTube embed), and "where to watch" by region
- **Region selector** — a dropdown of common regions on the detail page (not full geolocation detection); your pick gets stored in a cookie through `POST /api/region` and read on the server on later visits

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

### 🧠 Why I made these choices (interview prep)

- **One shared `MediaDetailPage` for both movies and TV shows.** TMDB's two endpoints (`/movie/{id}` and `/tv/{id}`) return almost the same shape of data, just with different field names — `title` vs `name`, `release_date` vs `first_air_date`, `runtime` vs `episode_run_time`. I handle those small differences inside one shared component instead of maintaining two nearly-identical pages.
- **I used `append_to_response` on the detail page.** TMDB lets you bundle `credits`, `videos`, and `watch/providers` into the same request as the main detail call. That's one request instead of four separate ones for what's really a single page load.
- **Region is stored as a cookie, not a column on `User`.** It's just a display preference, not something tied to your identity. Putting it in the database would mean a migration and a database write every time someone switches region, for something that doesn't need to survive a cleared browser or be searchable.
- **Search reads from the URL (`?q=`) instead of only living in local state.** The actual TMDB fetch happens in an async Server Component that reads `searchParams`. `SearchBox` itself is a small Client Component whose only job is to debounce typing and update the URL. That keeps results server-rendered — no loading flash the first time the page appears — while still feeling interactive, and it means a search can be shared as a link.
- **TMDB responses are cached for an hour** (`next: { revalidate: 3600 }` in `tmdb.ts`). Trending lists, cast info, and provider info don't change minute to minute, so there's no reason to hit TMDB fresh on every single page load — and it keeps me comfortably under the free-tier rate limit.

### Running it locally

You'll need a TMDB API key on top of the Phase 1 setup:

1. Create a free account at themoviedb.org → **Settings → API** → request a key (Developer tier)
2. Add it to `.env`:
   ```
   TMDB_API_KEY="your-key-here"
   ```
3. `npm run dev` (same as before)

### ✅ How to test Phase 2

1. Go to `/browse` → should show a grid of currently trending titles
2. Go to `/search`, type a title (e.g. "Inception") → results should appear a moment after you stop typing
3. Click any result → should land on its detail page with poster, synopsis, cast photos, and an embedded trailer if one's available
4. On the detail page, change the region dropdown → the "where to watch" section should update for that region after the page refreshes
5. Search for something with no matches (e.g. "asdkfjasdf") → should show the "No results" empty state instead of an error
6. Temporarily comment out `TMDB_API_KEY` in `.env`, restart the dev server, and reload `/browse` → should show an "unavailable right now" empty state instead of crashing

If all six work, Phase 2 is solid.

---

## 📊 Phase 3: watchlist, ratings, and the dashboard

### What's new

- **Schema**: three new models — `Title` (a local cache of TMDB info so the dashboard never has to call TMDB per row), `WatchlistItem` (planned or watched), and `Rating` (a 1–10 score)
- **`POST/PATCH/DELETE /api/watchlist`** — add a title, switch between planned and watched, or remove it
- **`POST/DELETE /api/ratings`** — rate (or re-rate) a title 1–10, or remove a rating
- **Watchlist button** on every detail page (`+ Add to Watchlist` → `Planned` → `Mark as Watched` → `✓ Watched`, plus a Remove option)
- **Quick-add button** — a small `+` overlay on every poster card in search/browse results, so you can add something to your watchlist without leaving the grid
- **Rating control** on every detail page — click 1–10 to rate
- **`/dashboard`** — your planned watchlist, your rating history, and a most-watched-genres bar chart. It's gated behind login and redirects to `/login` if you're signed out

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

### 🧠 Why I made these choices (interview prep)

- **The server re-fetches title info from TMDB instead of trusting the client.** Both `/api/watchlist` and `/api/ratings` call a shared function, `ensureTitleCached()`, which only ever accepts a `{ tmdbId, mediaType }` pair — never a title/poster/genre payload sent from the browser. That keeps the cache trustworthy (a buggy or malicious client can't write fake data into it), and it means the quick-add button on a poster card and the full button on the detail page can hit the exact same endpoint with the exact same tiny payload.
- **Rating something automatically marks it as watched.** `/api/ratings` updates the `WatchlistItem` to "watched" in the same database transaction as saving the rating. You logically can't rate something you haven't watched, so this saves the user an extra "add to watchlist" step before they can rate directly from a detail page.
- **The quick-add button only adds — it never removes or shows current status.** Showing accurate status on every single card in a 20-item grid would mean a watchlist-status check for every card (or one big combined query). The full controls — mark watched, remove — live on the detail page instead, where that lookup is already just one query per page load rather than many.
- **I always use `(tmdbId, mediaType)` together as a key, never `tmdbId` by itself.** TMDB IDs aren't unique across types — movie #550 and TV show #550 are two completely different things. So every model that references a title uses the pair together, both as `Title`'s primary key and as the per-user uniqueness rule for `WatchlistItem` and `Rating`.
- **Genres are stored as a plain `String[]` on `Title`, not split into a separate `Genre` table with a join table.** This cache only exists for display and for one aggregate stat (most-watched genres) — it's not something other parts of the app need to query relationally, so the extra normalization that would matter in a "real" transactional system just isn't worth the complexity here.

### Running it locally

New migration needed — same `.env` as Phase 2, no new environment variables.

```bash
npx prisma migrate dev --name add_watchlist_and_ratings
npm run dev
```

### ✅ How to test Phase 3

1. From `/browse` or `/search`, click the `+` button on a poster card → it should turn into a checkmark
2. Go to `/dashboard` → that title should show up under "Watchlist"
3. Open that title's detail page → the watchlist button should say "Planned" (matching step 1), with a "Mark as Watched" option
4. Click "Mark as Watched" → the button updates to "✓ Watched"
5. Scroll to "Your rating" and click a number 1–10 → it should highlight right away
6. Go back to `/dashboard` → the title should now appear under "Ratings" with that score, and "Most-watched genres" should reflect it
7. On the dashboard, click "Clear rating" → it disappears from Ratings (its watched status stays untouched)
8. Log out and visit `/dashboard` directly → should redirect to `/login` instead of erroring
9. While logged out, click the `+` quick-add button → should redirect to `/login` instead of failing silently

If all nine work, Phase 3 is solid, and the core feature set (auth, search/browse, detail pages, watchlist, ratings, dashboard) is complete end to end.

---

## ⭐ Post-Phase-3 additions: star ratings, reviews, and catalog rows

These three came in as follow-up requests after the original spec's core features were already done, so I kept them as their own section instead of folding them into "Phase 3" above.

### What's new

- **Quarter-star ratings.** Ratings moved from a 1–10 whole number to a 0.25–5.0 decimal — Letterboxd-style, but quarter-star instead of half-star. I rebuilt `RatingControl` around a custom star widget: two identically-laid-out rows of star icons, a muted outline row underneath and an accent-filled row on top that's clipped to a percentage. That way the whole widget only needs one number (the fill %) instead of calculating each star individually.
- **Written reviews.** `Rating` gained an optional `comment` field. Comments only make sense once there's already a score, so the "Add a review" box only shows up after a rating has been set.
- **Catalog rows.** The home page now shows several horizontally-scrolling, Netflix-style rows (Trending, Popular Movies, Top Rated, Popular TV, Action, Comedy, Horror) instead of a plain hero section. This is also what makes the home page feel like it has "more to scroll" — instead of one long page, there are several independently-scrolling rows stacked on top of each other.

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

`src/lib/tmdb.ts` also gained `getMediaList()` — a generic helper for endpoints that only return one media type at a time (`/movie/popular`, `/tv/top_rated`, `/discover/movie?with_genres=...`), since those don't include a `media_type` field on each result the way `/search/multi` and `/trending/*` do.

### 🧠 Why I made these choices (interview prep)

- **Quarter-star precision comes from one clip percentage, not five separate star calculations.** The star widget is two `<div>`s with identical flex layouts stacked on top of each other — one full row of outline stars underneath, and a row of accent-filled stars on top, inside a container whose `width` is set to `(value / 5) * 100%` with `overflow: hidden`. Since both rows share the exact same gaps and sizing, clipping the top row at any percentage automatically reveals a proportional amount of filled stars — there's no need to work out each star's fill individually. The fill amount comes from cursor position while hovering, and gets locked in from the click position.
- **A comment can't exist without a score.** Rather than having `comment` be its own independent field, I treat it as conceptually dependent on `score`, both in the schema and the UI — the "Add a review" control simply doesn't render until `score !== null`. This avoids having to handle a half-finished state (a review with no rating attached) everywhere ratings get shown.
- **The home page calls TMDB seven times and can tolerate some of them failing.** I used `Promise.allSettled` instead of `Promise.all`, so if one catalog's request fails — a temporary TMDB hiccup, a bad genre id — the rest of the rows still render fine. With `Promise.all`, one flaky row would have blanked the whole home page.
- **Catalogs live on the home page; `/browse` stays a plain grid.** They do two different jobs: the home page is for casual browsing and discovery (several angles at once, low commitment, just swipe past what doesn't interest you), while `/browse` is for "show me everything trending right now" in one scannable view. Merging them into one page would have made both jobs worse.

### Running it locally

New migration (changes the `ratings` table's `score` column type and adds `comment`):

```bash
npx prisma migrate dev --name add_star_ratings_and_comments
npm run dev
```

Existing rating rows from before this change get reset as part of the same migration — you'll be asked to confirm a schema reset.

### ✅ How to test

1. Open any title's detail page → the rating section should now show five outline stars
2. Hover across them → they should fill in smoothly in quarter increments as you move, not jump in whole-star steps
3. Click partway through a star → the score under the stars should read something like "3.25 / 5", not a whole number
4. A "+ Add a review" link should now be visible → click it, type a sentence, **Save review** → it should show up as an italicized quote below the stars
5. Refresh the page → both the star fill and the review text should still be there
6. Go to `/dashboard` → the same title should appear under Ratings with a smaller version of the same star widget and the review visible
7. Go to the home page (`/`) → you should see several horizontally-scrolling rows (Trending, Popular Movies, Action, etc.); try scrolling one sideways on desktop (mouse wheel/trackpad) and, if you can, on a phone (touch swipe)
8. Click the quick-add `+` button on a poster inside one of the home page rows → same behavior as on `/browse` or `/search`

---

## 🎨 Design revision: layout width, accent color, and polish

A round of feedback after the features above landed: the page felt too narrow on a laptop screen, the dashboard rows were cramped, the star widget and catalog rows needed more visual polish, the accent color should read as orange (not gold), and `/browse` needed a way to filter by genre.

### What changed

- **Page width**: the main container went from `max-w-5xl` (1024px) to `max-w-[1440px]` — on a typical laptop screen, that's the difference between large empty margins and the page actually using the available space. Grids on `/browse` and `/search` gained `xl`/`2xl` breakpoints to take advantage of the extra width.
- **Accent color**: `--color-accent` moved from a gold/amber (`#f2a33c`) to a vivid true orange (`#ff7a29`). Everything that reads that variable — buttons, the star widget, active filter pills, link hovers — updated automatically, with zero component-level changes needed. That's the whole point of driving color from CSS variables instead of hardcoding it in each component.
- **Dashboard cards**: `DashboardItemRow` went from a thin horizontal strip (a 56px-tall poster squeezed against cramped controls) to a proper card with a real-sized poster, sitting in a responsive grid (`grid-cols-1 sm:grid-cols-2 xl:grid-cols-3`) instead of one full-width vertical stack.
- **Star widget**: bigger stars, a smooth width transition on the fill instead of an instant jump, a subtle orange glow on hover, and the numeric score given more visual weight (bold, larger) instead of being the same muted gray as everything around it.
- **Catalog rows**: bigger poster cards, a subtle lift on hover, edge fade gradients that hint a row continues past what's visible, and scroll buttons on the left/right that appear on hover for mouse/trackpad users (touch devices already get native swipe, so the buttons only show up on `sm:` screens and larger).
- **Genre stats**: replaced the bar chart with a chip cloud (`GenreStatsCloud`). This actually fixes the "why does everything show 1" issue — it's not a bug, a small or genre-varied watch history genuinely produces a lot of ties at 1, and a bar chart makes ties look broken since the bars all end up the same length. A chip cloud doesn't have that problem, and it only highlights a "leading" genre once there's real separation in the data (`max > 1`), instead of arbitrarily picking one of several tied genres.
- **Genre filtering on `/browse`**: added a row of genre pills (`GenreFilterBar`) above the grid. Picking one switches the page from "trending" to "popular movies in this genre" using TMDB's `/discover/movie?with_genres=...` endpoint. It's built as plain links that update a `?genre=` URL param — no client-side JavaScript needed for the filtering itself, which keeps it simple, fast, and bookmarkable, matching how `/search` already works with `?q=`.

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

### 🧠 Why I made these choices (interview prep)

- **Color lives in one place.** Changing the accent hue meant touching exactly one line in `globals.css` — every button, active state, and glow effect across the app picked it up automatically, because nothing hardcodes a hex value anywhere; everything reads `var(--color-accent)` through Tailwind's theme tokens. That's the payoff of setting up design tokens early instead of scattering color values through components.
- **The genre filter needs zero client-side JavaScript.** Each pill is a real `<a>` tag (through Next's `Link`) pointing at `/browse?genre=28`. Clicking it is just a normal page navigation — the server component re-reads the URL and fetches accordingly. No `useState`, no `onClick` handlers, no hydration cost for what's fundamentally "go to a different URL." Good reminder that not every interactive-looking UI element actually needs to be a Client Component.
- **The "leading genre" highlight only shows up once there's real separation.** Marking an arbitrary tied genre as your "favorite" when everything is tied at 1 would be actively misleading, not just a small visual miss — so `GenreStatsCloud` checks `max > 1` before applying the highlighted style. What started as a bug-shaped complaint ("why is everything 1") turned into an actual design rule, not just a visual reskin.

### Follow-up: longer catalog rows

Each catalog/browse row was capped at TMDB's default page size (20 items) — fine for the grid, but pretty thin for a horizontally-scrolling row you could exhaust in a couple of swipes. `getTrending()` and `getMediaList()` in `tmdb.ts` now accept an optional `pageCount`: they fire that many TMDB page requests in parallel (`page=1`, `page=2`, ...) and merge the results, deduped by id. Catalog rows request 3 pages (~60 titles), and `/browse` requests 5 (~100), since it's the dedicated full-browsing page rather than a teaser row. This is a fixed, bounded amount, not true infinite scroll — infinite scroll would need its own loading state and scroll-position tracking, which isn't worth it for a portfolio project's browsing page.

### Follow-up: hover clipping fix + richer card interaction

Hovering a poster inside a catalog row was getting visually clipped at the top — the card would lift on hover, but the top part looked cut off. The cause: the row's scroll container sets `overflow-x: auto` but never touches `overflow-y`, and per the CSS spec, leaving one axis at its default `visible` while the other axis is anything else makes the browser treat the `visible` one as `auto` too. So the container was silently clipping vertically the whole time, and the hover lift (`translate-y`) only made it visible by moving the card into the clipped zone. I fixed it with `pt-3 pb-3` on the scroll container, giving the lift room to render without crossing that now-invisible clip boundary.

While fixing that, I also moved the hover interaction itself from a one-off `hover:-translate-y-1` on the catalog row's wrapper into `MediaCard` directly (lift + a slight scale + a warm accent-tinted shadow), so every poster gets the same richer hover state — including on `/browse` and `/search`, which previously had no hover motion at all, just a border color change.

### Follow-up: star centering, half-star, animations, and "Show more"

Four polish items in one round:

**Star centering.** Even after switching to a two-halves-per-star DOM approach, hovering the visual center of a star sometimes filled in the wrong amount — worst on the second and fourth stars, perfectly fine in the middle. The root cause: the outline row, the fill row, and the interactive row all had `gap-1.5` between stars, but the gap between two stars isn't actually inside either star's clickable area — so a cursor over the gap did the wrong thing, and the fill percent didn't line up cleanly with star boundaries. The fix: all three layers now use `gap-0` and rely on the star SVG's own internal padding for visual spacing. Now the fill percent maps exactly onto star positions (score 2.5 → 50% width → exactly half of the third star), and the clickable halves line up 1:1 with what you see.

**Half-star, not quarter-star.** The precision is `STEP = 0.5` in `rating-control.tsx`, and it's validated the same way in `/api/ratings/route.ts` (a Zod `refine` checking that `score * 2` is a whole number). That gives ten possible values (0.5, 1, 1.5, ..., 5), matching the Letterboxd standard.

**Route transitions.** A new `src/app/template.tsx` wraps every page in a container with a `page-enter` CSS animation — a subtle 250ms fade-up on mount. `template.tsx` is a Next.js built-in convention that re-mounts on every route change (unlike `layout.tsx`, which stays mounted), so a plain CSS `@keyframes` runs on every navigation — no client-side animation library needed for something this simple.

**Scroll-driven poster reveals.** Posters in catalog rows and the browse grid fade and rise into view as they scroll into the viewport, using `animation-timeline: view()` in CSS. This is a modern browser feature, and it degrades gracefully to "no animation" in browsers that don't support it yet, which is a perfectly fine fallback. No IntersectionObserver, no client-side JS at all.

**Catalog scroll amount.** Instead of scrolling a fixed 600px per arrow click (which felt either barely-there or like it overshot, depending on screen size), the buttons now scroll about 90% of the container's own visible width — basically one "page" of visible cards at a time, with a little overlap so the edge card stays partly visible for continuity.

**"Show more" pagination on `/browse`.** Instead of one hardcoded 5-page fetch, `/browse` reads a `?pages=N` URL param (default 2, max 10) and asks TMDB for that many pages. "Show more" is just a plain `<Link scroll={false}>` that doubles the page count in the URL — the whole thing stays a Server Component, with no `useState`, no infinite-scroll observer, and full bookmarkability at any depth. Once the max is reached, a small "everything popular in this list right now" note replaces the button.

**Respecting reduced motion.** Every animation added here (`page-enter`, `poster-reveal`, `poster-reveal-x`, `animate-fade-in`) gets silenced by a `@media (prefers-reduced-motion: reduce)` block in `globals.css`. Anyone with that OS setting turned on has it on for a real reason, and no amount of visual polish is worth overriding that.

### Follow-up: half-star ratings, Show More pagination, scroll animations

Four related requests handled in one round:

- **Ratings switched from quarter-star to half-star** (matching the Letterboxd standard). The API validator now enforces multiples of 0.5, with a small epsilon tolerance for floating-point drift, and the display formatter drops the trailing zero (so `.5` shows, but `.0` doesn't).
- **The star-centering bug is fixed properly this time** — not by measuring the SVG's transparent padding and correcting for it (which is fragile), but by restructuring the widget so each half of each star is its own real DOM element with its own `onMouseEnter`/`onClick`. Which value the cursor corresponds to is now a DOM question instead of a pixel-math question, so the visual center of a star and its interactive center are the same thing by construction.
- **`/browse` gained "Show more" pagination.** The pagination state lives in the URL (`?pages=2`), not in client state, so the page stays a Server Component — "Show more" is just a plain `<Link>` that doubles the page count. It's bookmarkable, refresh-safe, and needs no client-side fetching code. It starts at 2 pages, doubles on each click, and caps at 10 (~200 titles) to keep TMDB request counts reasonable.
- **Scroll-driven poster animations** using the modern CSS `animation-timeline: view()` — posters fade and lift into view as they enter the viewport (vertically for `/browse` and `/search`, horizontally for the catalog rows). No JS, no animation library — the browser drives the whole thing from actual scroll position. Chrome, Edge, and Opera support it today; browsers that don't (Safari, older Firefox) just see the posters appear instantly, which is a perfectly fine fallback. Everything's disabled under `prefers-reduced-motion: reduce`.

### 🧠 Why I made these choices (interview prep)

- **The star-centering fix is a design decision, not just a calculation.** I could have adjusted the pixel math to account for this particular star icon's transparent padding — but the moment I swapped the icon for a different shape or an emoji, that math would silently be wrong again. Making each half its own DOM element means the click target *is* what the user sees, with no gap between the two that could ever drift out of sync.
- **URL-driven pagination beats client-side pagination for this kind of feature.** "Show more" doesn't need optimistic updates or partial hydration — it just needs to load more items and show them. Making the button a `<Link href="?pages=4">` gets pagination essentially for free from the Next.js router: no `useState`, no `useEffect`, no client-side fetch, and the page stays bookmarkable and refresh-safe. I'd revisit this if scroll-position preservation ever mattered, but it doesn't here.
- **`animation-timeline: view()` over an IntersectionObserver-based library.** For scroll-driven fade-ins, the modern CSS approach means no JavaScript runs per scroll frame at all — the browser handles it on the compositor. Support isn't universal yet (Safari, older Firefox), so I treated this as a progressive enhancement: the CSS is wrapped in `@supports (animation-timeline: view())`, and unsupported browsers just skip the animation. A library-based approach would have added extra weight and a scroll listener for the exact same visual result.
