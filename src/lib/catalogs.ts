import { getTrending, getMediaList, type TmdbSearchResult } from "@/lib/tmdb";

export interface Catalog {
  id: string;
  title: string;
  fetch: () => Promise<TmdbSearchResult[]>;
}

// TMDB's genre ids are a fixed, well-documented list (not something we
// look up at runtime) — these three are stable across the API and don't
// change, so hardcoding them here is simpler than fetching
// /genre/movie/list on every request just to resolve a name to an id.
const GENRE_ACTION = 28;
const GENRE_COMEDY = 35;
const GENRE_HORROR = 27;

// TMDB returns 20 results per page. A single page felt thin for a
// horizontally-scrolling row — you'd hit the end almost immediately.
// Three pages (~60 titles) is a fixed, bounded amount that feels
// substantial to scroll through without going all the way to true
// infinite-scroll pagination, which would need its own loading-state
// and intersection-observer machinery for not much added benefit here.
const CATALOG_PAGE_COUNT = 3;

/**
 * The home page's curated rows, in display order. Each is independent —
 * if one TMDB call fails, the home page drops that row rather than
 * failing the whole page (see Promise.allSettled in app/page.tsx).
 */
export const CATALOGS: Catalog[] = [
  {
    id: "trending",
    title: "Trending This Week",
    fetch: () => getTrending(CATALOG_PAGE_COUNT),
  },
  {
    id: "popular-movies",
    title: "Popular Movies",
    fetch: () =>
      getMediaList("/movie/popular", "movie", {}, CATALOG_PAGE_COUNT),
  },
  {
    id: "top-rated-movies",
    title: "Top Rated Movies",
    fetch: () =>
      getMediaList("/movie/top_rated", "movie", {}, CATALOG_PAGE_COUNT),
  },
  {
    id: "popular-tv",
    title: "Popular TV Shows",
    fetch: () => getMediaList("/tv/popular", "tv", {}, CATALOG_PAGE_COUNT),
  },
  {
    id: "action",
    title: "Action Movies",
    fetch: () =>
      getMediaList(
        "/discover/movie",
        "movie",
        { with_genres: String(GENRE_ACTION), sort_by: "popularity.desc" },
        CATALOG_PAGE_COUNT
      ),
  },
  {
    id: "comedy",
    title: "Comedy Movies",
    fetch: () =>
      getMediaList(
        "/discover/movie",
        "movie",
        { with_genres: String(GENRE_COMEDY), sort_by: "popularity.desc" },
        CATALOG_PAGE_COUNT
      ),
  },
  {
    id: "horror",
    title: "Horror Movies",
    fetch: () =>
      getMediaList(
        "/discover/movie",
        "movie",
        { with_genres: String(GENRE_HORROR), sort_by: "popularity.desc" },
        CATALOG_PAGE_COUNT
      ),
  },
];
