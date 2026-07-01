import Link from "next/link";
import { getTrending, getMediaList } from "@/lib/tmdb";
import { getGenreName } from "@/lib/genres";
import { MediaCard } from "@/components/media-card";
import { EmptyState } from "@/components/empty-state";
import { GenreFilterBar } from "@/components/genre-filter-bar";

export const metadata = {
  title: "Browse — Reel",
};

// Every "Show more" click doubles the requested page count. Starting
// small (2 pages ≈ 40 titles) keeps the initial load light; doubling
// grows quickly enough that a user doesn't have to click "Show more"
// again and again to reach a substantial amount. Capped so someone
// can't bookmark ?pages=9999 and hammer TMDB with 500 sequential
// requests.
const INITIAL_PAGE_COUNT = 2;
const MAX_PAGE_COUNT = 10;

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string; pages?: string }>;
}) {
  const { genre, pages } = await searchParams;
  const genreId = genre ? Number(genre) : null;
  const genreName = genreId ? getGenreName(genreId) : null;

  // Read the current page count from the URL — driving pagination from
  // the URL rather than client-side state keeps the page bookmarkable,
  // survives refresh, and — because "Show more" is just a `<Link>` — is
  // still a Server Component with zero extra client JS.
  const requestedPages = pages ? Math.max(1, Number(pages)) : INITIAL_PAGE_COUNT;
  const pageCount = Math.min(requestedPages, MAX_PAGE_COUNT);

  let items;
  try {
    items = genreId
      ? await getMediaList(
          "/discover/movie",
          "movie",
          { with_genres: String(genreId), sort_by: "popularity.desc" },
          pageCount
        )
      : await getTrending(pageCount);
  } catch (error) {
    console.error("TMDB browse fetch failed:", error);
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Browse</h1>
        <EmptyState
          title="Browse is unavailable right now"
          description="Double-check your TMDB_API_KEY is set, then try again."
        />
      </div>
    );
  }

  const canShowMore = pageCount < MAX_PAGE_COUNT;
  const nextPageCount = Math.min(pageCount * 2, MAX_PAGE_COUNT);
  const showMoreHref = genreId
    ? `/browse?genre=${genreId}&pages=${nextPageCount}`
    : `/browse?pages=${nextPageCount}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {genreName ? `${genreName} Movies` : "Trending this week"}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {genreName
            ? `Popular ${genreName.toLowerCase()} movies right now.`
            : "What everyone's watching right now, movies and TV combined."}
        </p>
      </div>

      <GenreFilterBar selectedGenreId={genreId} />

      {items.length === 0 ? (
        <EmptyState
          title="Nothing found"
          description="Try a different genre."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
            {items.map((item) => (
              <div
                key={`${item.media_type}-${item.id}`}
                className="poster-reveal"
              >
                <MediaCard item={item} />
              </div>
            ))}
          </div>

          {canShowMore ? (
            <div className="flex justify-center pt-4">
              <Link
                href={showMoreHref}
                scroll={false}
                className="rounded-full border border-border bg-surface px-6 py-2.5 text-sm font-medium text-foreground transition hover:border-accent hover:bg-surface-raised"
              >
                Show more
              </Link>
            </div>
          ) : (
            <p className="pt-4 text-center text-xs text-muted">
              {items.length} titles shown — that&apos;s everything popular
              in this list right now.
            </p>
          )}
        </>
      )}
    </div>
  );
}
