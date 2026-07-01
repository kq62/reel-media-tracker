import { prisma } from "@/lib/prisma";
import type { MediaType } from "@/lib/tmdb";

export interface UserMediaState {
  watchlistStatus: "none" | "planned" | "watched";
  score: number | null;
  comment: string | null;
}

/**
 * Looks up whether the signed-in user already has this title on their
 * watchlist (and what status) and/or has rated it. Used by the detail
 * page to render the WatchlistButton/RatingControl in their correct
 * initial state instead of always starting from "not added yet".
 */
export async function getUserMediaState(
  userId: string | null,
  mediaType: MediaType,
  tmdbId: number
): Promise<UserMediaState> {
  if (!userId) {
    return { watchlistStatus: "none", score: null, comment: null };
  }

  const [watchlistItem, rating] = await Promise.all([
    prisma.watchlistItem.findUnique({
      where: { userId_tmdbId_mediaType: { userId, tmdbId, mediaType } },
    }),
    prisma.rating.findUnique({
      where: { userId_tmdbId_mediaType: { userId, tmdbId, mediaType } },
    }),
  ]);

  return {
    watchlistStatus:
      (watchlistItem?.status as "planned" | "watched" | undefined) ?? "none",
    score: rating?.score ?? null,
    comment: rating?.comment ?? null,
  };
}
