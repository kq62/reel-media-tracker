import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeGenreCounts } from "@/lib/genre-stats";
import { DashboardItemRow } from "@/components/dashboard/dashboard-item-row";
import { GenreStatsCloud } from "@/components/dashboard/genre-stats-cloud";
import { WatchlistButton } from "@/components/watchlist-button";
import { RatingControl } from "@/components/rating-control";
import { EmptyState } from "@/components/empty-state";
import Link from "next/link";

export const metadata = {
  title: "Dashboard — Reel",
};

// Shared by the Watchlist and Ratings sections below — a responsive
// card grid rather than one full-width column, which is what gave the
// dashboard its "cramped" feel before: every card had to squeeze into a
// thin horizontal strip the width of the whole page.
const CARD_GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }
  const userId = session.user.id;

  // Two queries instead of one: watchlist items and ratings are
  // independent concepts (you can rate something without it being on
  // your "planned" list, per the /api/ratings auto-upsert behavior), so
  // they're fetched and rendered as separate sections rather than forced
  // into a single joined shape.
  const [watchlistItems, ratings] = await Promise.all([
    prisma.watchlistItem.findMany({
      where: { userId },
      include: { title: true },
      orderBy: { addedAt: "desc" },
    }),
    prisma.rating.findMany({
      where: { userId },
      include: { title: true },
      orderBy: { ratedAt: "desc" },
    }),
  ]);

  const planned = watchlistItems.filter((item) => item.status === "planned");
  const watched = watchlistItems.filter((item) => item.status === "watched");
  const genreCounts = computeGenreCounts(watched.map((item) => item.title));

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-2xl font-bold">Your Dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          {watched.length} watched · {planned.length} planned ·{" "}
          {ratings.length} rated
        </p>
      </div>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-lg font-semibold">Most-watched genres</h2>
        <div className="mt-3">
          <GenreStatsCloud counts={genreCounts} watchedCount={watched.length} />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">
          Watchlist ({planned.length})
        </h2>
        <div className={`mt-4 ${CARD_GRID}`}>
          {planned.length === 0 ? (
            <div className="sm:col-span-2 xl:col-span-3">
              <EmptyState
                title="Nothing planned yet"
                description="Add titles from search or browse to build your watchlist."
              />
            </div>
          ) : (
            planned.map((item) => (
              <DashboardItemRow
                key={item.id}
                tmdbId={item.tmdbId}
                mediaType={item.mediaType as "movie" | "tv"}
                title={item.title.title}
                posterPath={item.title.posterPath}
              >
                <WatchlistButton
                  tmdbId={item.tmdbId}
                  mediaType={item.mediaType as "movie" | "tv"}
                  initialStatus="planned"
                  isAuthenticated
                />
              </DashboardItemRow>
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Ratings ({ratings.length})</h2>
        <div className={`mt-4 ${CARD_GRID}`}>
          {ratings.length === 0 ? (
            <div className="sm:col-span-2 xl:col-span-3">
              <EmptyState
                title="No ratings yet"
                description="Rate something you've watched from its detail page."
              />
            </div>
          ) : (
            ratings.map((rating) => (
              <DashboardItemRow
                key={rating.id}
                tmdbId={rating.tmdbId}
                mediaType={rating.mediaType as "movie" | "tv"}
                title={rating.title.title}
                posterPath={rating.title.posterPath}
              >
                <RatingControl
                  tmdbId={rating.tmdbId}
                  mediaType={rating.mediaType as "movie" | "tv"}
                  initialScore={rating.score}
                  initialComment={rating.comment}
                  isAuthenticated
                  size="sm"
                />
              </DashboardItemRow>
            ))
          )}
        </div>
      </section>

      {planned.length === 0 && ratings.length === 0 && (
        <div className="flex gap-3">
          <Link
            href="/browse"
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90"
          >
            Browse trending titles
          </Link>
          <Link
            href="/search"
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-surface-raised"
          >
            Search
          </Link>
        </div>
      )}
    </div>
  );
}
