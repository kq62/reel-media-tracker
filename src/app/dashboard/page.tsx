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
import { RecommendationTeaser } from "@/components/dashboard/recommendation-teaser";
import Link from "next/link";
import { LIKED_THRESHOLD, type LikedTitleData } from "@/lib/recommendations";
import { getMediaDetail, type MediaType } from "@/lib/tmdb";
import { gatherAndScoreCandidates } from "@/lib/recommendation-candidates";

export const metadata = {
  title: "Dashboard — Reel",
};

const CARD_GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3";

async function getQuickRecommendations(userId: string) {
  try {
    const likedRatings = await prisma.rating.findMany({
      where: { userId, score: { gte: LIKED_THRESHOLD } },
      include: { title: true },
      orderBy: { score: "desc" },
      take: 3,
    });
    if (likedRatings.length === 0) return [];

    const likedTitleData: LikedTitleData[] = await Promise.all(
      likedRatings.map(async (rating) => {
        const mediaType = rating.mediaType as MediaType;
        const detail = await getMediaDetail(mediaType, rating.tmdbId);
        return {
          tmdbId: rating.tmdbId,
          mediaType,
          score: rating.score,
          genres: rating.title.genres,
          cast: detail.credits.cast.slice(0, 5).map((m) => m.name),
          keywords: [],
        };
      })
    );

    const seenItems = await prisma.watchlistItem.findMany({
      where: { userId },
      select: { tmdbId: true, mediaType: true },
    });
    const seenKeys = new Set([
      ...seenItems.map((i) => `${i.mediaType}-${i.tmdbId}`),
      ...likedRatings.map((r) => `${r.mediaType}-${r.tmdbId}`),
    ]);

    return gatherAndScoreCandidates({ likedTitleData, seenKeys, limit: 4 });
  } catch {
    return [];
  }
}

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
  const [watchlistItems, ratings, quickRecs] = await Promise.all([
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
    getQuickRecommendations(userId),
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

      {quickRecs.length > 0 && (
        <RecommendationTeaser recommendations={quickRecs} />
      )}

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
