import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  LIKED_THRESHOLD,
  type LikedTitleData,
} from "@/lib/recommendations";
import {
  getTitleKeywords,
  getMediaDetail,
  tmdbImageUrl,
  type MediaType,
} from "@/lib/tmdb";
import { gatherAndScoreCandidates } from "@/lib/recommendation-candidates";
import { EmptyState } from "@/components/empty-state";
import { WatchlistQuickAddButton } from "@/components/watchlist-quick-add-button";

export const metadata = {
  title: "Recommended for You — Reel",
};

const MAX_SEED_TITLES = 5;
const CAST_MEMBERS_PER_TITLE = 5;

export default async function RecommendationsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const likedRatings = await prisma.rating.findMany({
    where: { userId, score: { gte: LIKED_THRESHOLD } },
    include: { title: true },
    orderBy: { score: "desc" },
    take: MAX_SEED_TITLES,
  });

  if (likedRatings.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Recommended for You</h1>
        <EmptyState
          title="Rate some titles first"
          description={`Rate at least one title ${LIKED_THRESHOLD} stars or higher and we'll recommend similar ones.`}
        />
      </div>
    );
  }

  const likedTitleData: LikedTitleData[] = await Promise.all(
    likedRatings.map(async (rating) => {
      const mediaType = rating.mediaType as MediaType;
      const [detail, keywords] = await Promise.all([
        getMediaDetail(mediaType, rating.tmdbId),
        getTitleKeywords(mediaType, rating.tmdbId),
      ]);
      return {
        tmdbId: rating.tmdbId,
        mediaType,
        score: rating.score,
        genres: rating.title.genres,
        cast: detail.credits.cast.slice(0, CAST_MEMBERS_PER_TITLE).map((m) => m.name),
        keywords: keywords.map((k) => k.name),
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

  const recommendations = await gatherAndScoreCandidates({
    likedTitleData,
    seenKeys,
    limit: 20,
  });

  const seedTitles = likedRatings.map((r) => ({
    title: r.title.title,
    score: r.score,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Recommended for You</h1>
        <p className="mt-1 text-sm text-muted">
          Based on your highest-rated titles — filtered to well-received,
          popular titles only.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          Based on your ratings of
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {seedTitles.map((seed) => (
            <span
              key={seed.title}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-raised px-3 py-1 text-sm"
            >
              {seed.title}
              <span className="text-accent">
                ★ {seed.score.toFixed(1).replace(/\.0$/, "")}
              </span>
            </span>
          ))}
        </div>
      </div>

      {recommendations.length === 0 ? (
        <EmptyState
          title="No recommendations yet"
          description="Try rating more titles — the more you rate, the better your recommendations."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {recommendations.map(({ item, matchedGenres, matchedCast }) => {
            const posterUrl = tmdbImageUrl(item.poster_path, "w342");
            const allMatches = [
              ...matchedGenres.slice(0, 2),
              ...matchedCast.slice(0, 1),
            ];
            return (
              <div
                key={`${item.media_type}-${item.id}`}
                className="group relative flex gap-3 rounded-xl border border-border bg-surface p-3 transition hover:border-accent/50"
              >
                <Link
                  href={`/${item.media_type}/${item.id}`}
                  className="relative aspect-[2/3] w-20 shrink-0 overflow-hidden rounded-lg bg-surface-raised"
                >
                  {posterUrl ? (
                    <Image
                      src={posterUrl}
                      alt={item.title ?? ""}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  ) : null}
                </Link>

                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
                    {item.media_type === "tv" ? "TV Show" : "Movie"}
                  </span>
                  <Link
                    href={`/${item.media_type}/${item.id}`}
                    className="mt-0.5 line-clamp-2 text-sm font-semibold hover:text-accent"
                  >
                    {item.title}
                  </Link>
                  {item.vote_average > 0 && (
                    <p className="mt-1 text-xs text-muted">
                      ★ {item.vote_average.toFixed(1)} TMDB
                    </p>
                  )}
                  {allMatches.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {allMatches.map((match) => (
                        <span
                          key={match}
                          className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent"
                        >
                          {match}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-auto pt-2">
                    <WatchlistQuickAddButton
                      tmdbId={item.id}
                      mediaType={item.media_type}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
