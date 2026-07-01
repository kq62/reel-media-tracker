// Thin wrapper around the TMDB REST API. Every TMDB call in the app goes
// through one of the functions below instead of calling `fetch` directly
// in components/routes. That gives us one place to handle the base URL,
// API key, error handling, and (later, if needed) response caching —
// instead of that logic being duplicated across every page that needs
// movie data.
//
// We use TMDB's v3 API key (a query param) rather than the v4 read
// access token (a bearer header) purely because it's simpler to reason
// about and explain — one fewer concept (auth headers) for what's
// otherwise a fully public, read-only API.

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

export type MediaType = "movie" | "tv";

export interface TmdbSearchResult {
  id: number;
  media_type: MediaType;
  title?: string; // movies use `title`
  name?: string; // tv shows use `name`
  release_date?: string;
  first_air_date?: string;
  poster_path: string | null;
  overview: string;
  vote_average: number;
  vote_count: number; // needed to filter out statistically meaningless ratings
}

export interface TmdbCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

export interface TmdbVideo {
  id: string;
  key: string; // YouTube video key
  site: string; // "YouTube", "Vimeo", etc.
  type: string; // "Trailer", "Teaser", etc.
}

export interface TmdbWatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

export interface TmdbWatchProvidersByRegion {
  link?: string;
  flatrate?: TmdbWatchProvider[]; // subscription streaming
  rent?: TmdbWatchProvider[];
  buy?: TmdbWatchProvider[];
}

export interface TmdbDetail {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  runtime?: number; // movies
  episode_run_time?: number[]; // tv
  genres: { id: number; name: string }[];
  vote_average: number;
  credits: { cast: TmdbCastMember[] };
  videos: { results: TmdbVideo[] };
  "watch/providers": { results: Record<string, TmdbWatchProvidersByRegion> };
}

function getApiKey(): string {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    throw new Error(
      "TMDB_API_KEY is not set. Add it to your .env file — see .env.example."
    );
  }
  return apiKey;
}

async function tmdbFetch<T>(
  path: string,
  searchParams: Record<string, string> = {}
): Promise<T> {
  const url = new URL(`${TMDB_BASE_URL}${path}`);
  url.searchParams.set("api_key", getApiKey());
  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    // Cache TMDB responses for an hour — this data (popular titles, cast
    // lists, watch providers) doesn't change minute to minute, so there's
    // no reason to hit TMDB fresh on every page load.
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`TMDB request failed: ${response.status} ${path}`);
  }

  return response.json() as Promise<T>;
}

/** Search movies and TV shows by title. */
export async function searchMedia(
  query: string
): Promise<TmdbSearchResult[]> {
  const data = await tmdbFetch<{ results: TmdbSearchResult[] }>(
    "/search/multi",
    { query }
  );
  // /search/multi can also return `person` results (actors) — we only
  // care about titles you could actually add to a watchlist.
  return data.results.filter(
    (result) => result.media_type === "movie" || result.media_type === "tv"
  );
}

/**
 * Trending movies and TV shows this week — used for the browse page and
 * the home page's "Trending" row.
 *
 * `pageCount` fetches that many TMDB pages (20 results each) in
 * parallel and merges them, deduped by (media_type, id) since the same
 * title can't appear twice in one page but could in principle straddle
 * a page boundary between calls. This is a fixed, bounded list — not
 * infinite scroll — just more than TMDB's single-page default of 20.
 */
export async function getTrending(
  pageCount: number = 1
): Promise<TmdbSearchResult[]> {
  const pages = await Promise.all(
    Array.from({ length: pageCount }, (_, i) =>
      tmdbFetch<{ results: TmdbSearchResult[] }>("/trending/all/week", {
        page: String(i + 1),
      })
    )
  );

  const seen = new Set<string>();
  const merged: TmdbSearchResult[] = [];
  for (const page of pages) {
    for (const result of page.results) {
      if (result.media_type !== "movie" && result.media_type !== "tv") {
        continue;
      }
      const key = `${result.media_type}-${result.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(result);
      }
    }
  }
  return merged;
}

/**
 * Fetches a single-media-type list endpoint — `/movie/popular`,
 * `/tv/top_rated`, `/discover/movie?with_genres=...`, etc. Unlike
 * `/search/multi` and `/trending/*`, these endpoints don't include a
 * `media_type` field on each result (since the endpoint itself already
 * implies it), so we tag it on the way out. This is what powers the
 * home page's curated catalog rows.
 *
 * Same `pageCount` behavior as `getTrending` above: a bounded number of
 * pages merged together, not true infinite pagination.
 */
export async function getMediaList(
  path: string,
  mediaType: MediaType,
  searchParams: Record<string, string> = {},
  pageCount: number = 1
): Promise<TmdbSearchResult[]> {
  const pages = await Promise.all(
    Array.from({ length: pageCount }, (_, i) =>
      tmdbFetch<{ results: Omit<TmdbSearchResult, "media_type">[] }>(path, {
        ...searchParams,
        page: String(i + 1),
      })
    )
  );

  const seen = new Set<number>();
  const merged: TmdbSearchResult[] = [];
  for (const page of pages) {
    for (const result of page.results) {
      if (!seen.has(result.id)) {
        seen.add(result.id);
        merged.push({ ...result, media_type: mediaType });
      }
    }
  }
  return merged;
}

/**
 * Full detail for a single title, including cast, trailers, and watch
 * providers in one call via TMDB's `append_to_response` param — this
 * avoids three separate round trips for what's logically one detail page.
 */
export async function getMediaDetail(
  mediaType: MediaType,
  tmdbId: number
): Promise<TmdbDetail> {
  return tmdbFetch<TmdbDetail>(`/${mediaType}/${tmdbId}`, {
    append_to_response: "credits,videos,watch/providers",
  });
}

/** Builds a full poster/backdrop/profile image URL from a TMDB path. */
export function tmdbImageUrl(
  path: string | null,
  size: "w185" | "w342" | "w500" | "w780" | "original" = "w342"
): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
}

/**
 * TMDB's "similar" endpoint returns titles that share genre/style with
 * the given title. Quality varies a lot — it includes obscure and
 * low-rated titles, so callers should filter by vote_average and
 * vote_count before using these as recommendation candidates.
 */
export async function getSimilarTitles(
  mediaType: MediaType,
  tmdbId: number
): Promise<TmdbSearchResult[]> {
  const data = await tmdbFetch<{
    results: Omit<TmdbSearchResult, "media_type">[];
  }>(`/${mediaType}/${tmdbId}/similar`);
  return data.results.map((r) => ({ ...r, media_type: mediaType }));
}

/**
 * TMDB's "recommendations" endpoint is more editorially curated than
 * "similar" — it tends to return well-known, higher-rated titles that
 * share the same spirit as the seed, rather than anything loosely
 * genre-adjacent regardless of quality. Using both endpoints and
 * merging/deduplicating gives us a wider pool than either alone, with
 * the recommendations endpoint contributing the higher-signal results.
 */
export async function getRecommendedTitles(
  mediaType: MediaType,
  tmdbId: number
): Promise<TmdbSearchResult[]> {
  const data = await tmdbFetch<{
    results: Omit<TmdbSearchResult, "media_type">[];
  }>(`/${mediaType}/${tmdbId}/recommendations`);
  return data.results.map((r) => ({ ...r, media_type: mediaType }));
}

export interface TmdbKeyword {
  id: number;
  name: string;
}

/**
 * Keywords are TMDB's fine-grained tags (e.g. "based on novel",
 * "time travel", "female protagonist"). They're a richer similarity
 * signal than genres alone — two thrillers may share a genre but differ
 * completely in theme; shared keywords indicate closer thematic overlap.
 * Movie and TV use different endpoint paths and response shapes, so we
 * normalise them here.
 */
export async function getTitleKeywords(
  mediaType: MediaType,
  tmdbId: number
): Promise<TmdbKeyword[]> {
  if (mediaType === "movie") {
    const data = await tmdbFetch<{ keywords: TmdbKeyword[] }>(
      `/movie/${tmdbId}/keywords`
    );
    return data.keywords ?? [];
  } else {
    const data = await tmdbFetch<{ results: TmdbKeyword[] }>(
      `/tv/${tmdbId}/keywords`
    );
    return data.results ?? [];
  }
}

/** Pulls the display title regardless of movie ("title") vs tv ("name"). */
export function getDisplayTitle(
  item: Pick<TmdbSearchResult | TmdbDetail, "title" | "name">
): string {
  return item.title ?? item.name ?? "Untitled";
}

/** Pulls the release year regardless of movie vs tv field names. */
export function getReleaseYear(
  item: Pick<TmdbSearchResult, "release_date" | "first_air_date">
): string | null {
  const date = item.release_date || item.first_air_date;
  return date ? date.slice(0, 4) : null;
}
