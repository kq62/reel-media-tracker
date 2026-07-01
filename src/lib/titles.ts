import { prisma } from "@/lib/prisma";
import { getMediaDetail, getDisplayTitle, type MediaType } from "@/lib/tmdb";

/**
 * Upserts the Title cache row for (tmdbId, mediaType), fetching fresh
 * data from TMDB if needed.
 *
 * Both the watchlist and ratings API routes call this before writing
 * their own row, rather than accepting title/poster/genre fields from
 * the client directly. That keeps the cache trustworthy (a client can't
 * poison it with fake data) and means callers — the detail page, the
 * quick-add button on a search/browse card — only ever need to send
 * `{ tmdbId, mediaType }`, nothing else.
 */
export async function ensureTitleCached(mediaType: MediaType, tmdbId: number) {
  const existing = await prisma.title.findUnique({
    where: { tmdbId_mediaType: { tmdbId, mediaType } },
  });

  // Re-fetching from TMDB on every watchlist/rating action would be
  // wasteful — the cache only needs to be refreshed occasionally, not on
  // every interaction with a title we already know about.
  if (existing) {
    return existing;
  }

  const detail = await getMediaDetail(mediaType, tmdbId);

  return prisma.title.upsert({
    where: { tmdbId_mediaType: { tmdbId, mediaType } },
    create: {
      tmdbId,
      mediaType,
      title: getDisplayTitle(detail),
      posterPath: detail.poster_path,
      genres: detail.genres.map((g) => g.name),
    },
    update: {},
  });
}
