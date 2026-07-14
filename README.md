<<<<<<< HEAD
# 🎬 Reel — Personal Media Tracker & Discovery Platform
=======
# Reel - Personal Media Tracker & Discovery Platform
>>>>>>> edb15160de63ed6fcddf462af2f8cf058fde3bb9

Reel is a web app for tracking what you watch, rating it, and finding what to watch next. Think of it as a personal movie and TV diary, similar in spirit to Letterboxd, but covering both movies and TV shows.

This README has two parts: a plain overview anyone can follow, and a technical deep-dive further down for anyone who wants to see how it's actually built.

---

## 🧠 What it does

- **Sign up and log in** with an email and password
- **Search and browse** movies and TV shows, pulled live from The Movie Database (TMDB)
- **View details** for any movie or show — synopsis, cast, trailer, and where to watch it in your region
- **Build a watchlist** — mark something as planned to watch, then mark it watched later
- **Rate what you've watched** using a 5-star rating (half-star precision, like Letterboxd) and optionally write a short review
- **See your stats on a dashboard** — your watchlist, your ratings, and a breakdown of your most-watched genres
- **Browse curated rows** on the home page (Trending, Popular Movies, Top Rated, Action, Comedy, Horror, etc.), similar to Netflix's homepage layout
- **Filter by genre** on the browse page

## 🧱 Built with

- **Next.js** — the framework powering both the pages you see and the backend behind the scenes
- **TypeScript** — a safer version of JavaScript
- **PostgreSQL** — the database that stores users, watchlists, and ratings
- **Prisma** — makes talking to the database easier and safer
- **NextAuth.js** — handles login and sessions
- **Tailwind CSS** — used for styling
- **TMDB API** — the source for all movie and TV show data

## 🛠️ How to run it locally

### Step 1: Get a database

Pick one of these:
- **Local**: install Postgres on your machine, then run `createdb media_tracker`
- **Supabase**: create a free project, then copy the connection string from Project Settings → Database
- **Railway**: create a new project → Add PostgreSQL → copy the connection string

### Step 2: Get a free TMDB API key

1. Create a free account at themoviedb.org
2. Go to **Settings → API** and request a key (choose the Developer tier)

### Step 3: Set up your environment variables

Copy the example file:
```bash
cp .env.example .env
```

Then open `.env` and fill in:
- `DATABASE_URL` — the connection string from Step 1
- `NEXTAUTH_SECRET` — any random secret string (you can generate one with `openssl rand -base64 32`)
- `NEXTAUTH_URL` — set this to `http://localhost:3000`
- `TMDB_API_KEY` — the key from Step 2

### Step 4: Install everything and set up the database

```bash
npm install
npx prisma generate
npx prisma migrate dev
```

### Step 5: Start the app

```bash
npm run dev
```

Then open `http://localhost:3000` in your browser.

## ✅ Quick check that everything works

1. Sign up for a new account, then log out and log back in
2. Search for a movie (e.g. "Inception") and open its detail page
3. Add it to your watchlist, then mark it as watched
4. Rate it and leave a short review
5. Go to your dashboard and confirm the title shows up under both your watchlist and your ratings

## 📁 Project structure

```
src/
  app/          # pages and API routes
  components/   # reusable UI pieces (navbar, cards, star rating, etc.)
  lib/          # helper code (TMDB requests, auth setup, database client)
  types/        # shared TypeScript types
prisma/
  schema.prisma # database structure
```

---

# 🔧 Technical deep-dive

Everything below is for anyone technical who wants the actual reasoning behind how this is built — architecture choices, tradeoffs, and the small bugs that came up along the way.

## Authentication

- **NextAuth v4, not the v5 beta.** v5 (Auth.js) is nicer to work with in the App Router, but it had been in beta for a long time. Auth is security-sensitive enough that I preferred the stable, fully-documented version over a beta API.
- **Sessions are JWTs, no database adapter.** The Credentials provider has no OAuth handshake, so there's nothing for a database adapter to save — the session lives in a signed cookie instead of a database row. That's also why the schema has no `Session`/`Account` tables. If Google/GitHub sign-in gets added later, that's the point to add `@next-auth/prisma-adapter` and those tables.
- **Signup is a hand-written API route.** NextAuth only handles signing *in* — it has no concept of "create an account." `/api/auth/signup` does the validation (Zod), hashes the password (bcrypt), and inserts the user, then immediately calls NextAuth's `signIn()` so the user doesn't have to log in a second time right after signing up.
- **One shared Prisma client (`src/lib/prisma.ts`).** Next.js hot-reloads files in dev, which would otherwise spin up a new `PrismaClient` (and connection pool) on every save. Storing the instance on `global` keeps it alive across reloads in dev; in production it's a no-op since each serverless invocation gets its own scope anyway.

## Search, browsing, and TMDB data

- **One shared `MediaDetailPage` for both movies and TV.** TMDB's `/movie/{id}` and `/tv/{id}` endpoints return almost identical shapes (`title` vs `name`, `release_date` vs `first_air_date`, `runtime` vs `episode_run_time`). Handling those differences inside one shared component avoids maintaining two near-duplicate pages.
- **`append_to_response` on the detail page.** TMDB lets `credits`, `videos`, and `watch/providers` be bundled into the same request as the base detail call — one request instead of four for what's really one page load.
- **Region is a cookie, not a `User` column.** It's just a display preference with no real tie to identity, so it's stored in a cookie (`POST /api/region`) rather than the database, avoiding a migration and a write on every region change.
- **Search reads from the URL (`?q=`), not just local state.** The TMDB fetch happens in an async Server Component reading `searchParams`; `SearchBox` is a small Client Component that only debounces typing and updates the URL. Results stay server-rendered (no loading flash on first paint) while still feeling interactive, and a search becomes a shareable link.
- **TMDB responses are cached for an hour** (`next: { revalidate: 3600 }`). Trending lists and cast/provider data don't change minute-to-minute, so there's no reason to hit TMDB fresh on every load — this also keeps requests comfortably under the free-tier rate limit.
- **`getMediaList()` handles endpoints without a `media_type` field**, since single-media-type endpoints (`/movie/popular`, `/tv/top_rated`, `/discover/movie`) don't return one the way `/search/multi` and `/trending/*` do.

## Watchlist and ratings

- **The server re-fetches title data from TMDB rather than trusting the client.** Both `/api/watchlist` and `/api/ratings` call a shared `ensureTitleCached()`, which only ever takes `{ tmdbId, mediaType }` — never a client-supplied title/poster/genre payload. That keeps the cache trustworthy and lets the quick-add button on a poster card and the full button on the detail page call the exact same endpoint.
- **Rating something auto-marks it watched.** `/api/ratings` upserts a `watched` `WatchlistItem` in the same transaction as the rating, since you logically can't rate something you haven't watched — saving a separate "add to watchlist" step.
- **The quick-add button only adds, never shows status.** Showing accurate watchlist status on every card in a 20-item grid would need a status check per card. Full controls (mark watched, remove) live on the detail page instead, where that's just one query per page load.
- **`(tmdbId, mediaType)` is always used as a pair, never `tmdbId` alone.** TMDB IDs aren't unique across types — movie #550 and TV show #550 are unrelated. Every model that references a title uses the pair as a compound key.
- **Genres are a plain `String[]` on `Title`, not a normalized table.** This cache exists only for display and one aggregate stat, so the extra structure a "real" relational system would need isn't earning its complexity here.

## Star ratings and reviews

- **Quarter-star (later half-star) precision from one clip percentage, not per-star math.** The widget is two identically-laid-out rows of star icons stacked on top of each other — a muted outline row underneath, and an accent-filled row on top clipped to `(value / 5) * 100%` width with `overflow: hidden`. Clipping the top row at any percentage reveals a proportional amount of filled stars automatically, so there's no need to calculate each star's fill individually.
- **A comment can't exist without a score.** `comment` is treated as dependent on `score` in both the schema and UI — the "Add a review" control only renders once `score !== null`, avoiding a half-finished "review with no rating" state.
- **Star-centering bug and its real fix.** Early on, hovering the visual center of a star sometimes filled the wrong amount because of `gap-1.5` spacing between stars — the gap wasn't part of either star's clickable area, so the fill percent didn't map cleanly to star boundaries. The properly fixed version restructures the widget so each half of each star is its own DOM element with its own `onMouseEnter`/`onClick` — which value the cursor maps to is now a DOM question, not a pixel-math one, so the visual and interactive centers can't drift apart.
- **Half-star, not quarter-star, in the final version** (`STEP = 0.5`), validated with a Zod `refine` checking `score * 2` is a whole number — matching the Letterboxd standard.

## Home page and catalog rows

- **The home page calls TMDB seven times and tolerates partial failure**, using `Promise.allSettled` instead of `Promise.all` — if one catalog request fails, the rest of the rows still render instead of the whole page blanking.
- **Catalogs live on the home page; `/browse` stays a flat grid.** Different jobs: the home page is for casual discovery across several angles, `/browse` is for "show me everything trending right now" in one scannable view.
- **Longer catalog rows via parallel pagination.** `getTrending()` and `getMediaList()` accept an optional `pageCount`, firing that many TMDB page requests in parallel and merging results (deduped by id) — catalog rows request 3 pages (~60 titles), `/browse` requests 5 (~100).
- **"Show more" pagination lives in the URL** (`?pages=N`, default 2, max 10), so the button is a plain `<Link>` that doubles the page count — no client-side fetch, fully bookmarkable and refresh-safe.

## Design and polish

- **Color lives in one place.** Changing the accent hue (`--color-accent`) touched exactly one line in `globals.css` — every button, active state, and glow updated automatically since nothing hardcodes a hex value anywhere.
- **The genre filter needs zero client-side JavaScript.** Each pill is a real `<a>` (via Next's `Link`) pointing at `/browse?genre=28` — a normal navigation, not a `useState`/`onClick` interaction.
- **The "leading genre" highlight only appears with real separation.** `GenreStatsCloud` checks `max > 1` before highlighting a "favorite" genre, since marking an arbitrary tied genre as the leader when everything's tied at 1 would be misleading, not just a cosmetic issue.
- **Hover clipping fix.** A catalog row's scroll container had `overflow-x: auto` but left `overflow-y` at its default, which per the CSS spec makes the browser treat both axes as `auto` — silently clipping hover-lifted cards at the top. Fixed with `pt-3 pb-3` giving the lift room to render.
- **Scroll-driven poster reveals** use the modern CSS `animation-timeline: view()` feature — posters fade and lift into view as they enter the viewport, with no JavaScript or scroll listeners. It's wrapped in `@supports (animation-timeline: view())` so unsupported browsers (Safari, older Firefox) just skip the animation gracefully.
- **Route transitions** come from `src/app/template.tsx`, a Next.js convention that re-mounts on every route change (unlike `layout.tsx`), running a plain CSS fade-up animation on every navigation.
- **Reduced-motion respect.** Every animation added is silenced under `@media (prefers-reduced-motion: reduce)`.
