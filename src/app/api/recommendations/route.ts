// This API route is kept as a thin wrapper for external/programmatic
// access to recommendations. The actual logic lives in
// src/lib/recommendation-candidates.ts (shared with the page).
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LIKED_THRESHOLD, type LikedTitleData } from "@/lib/recommendations";
import { getTitleKeywords, getMediaDetail, type MediaType } from "@/lib/tmdb";
import { gatherAndScoreCandidates } from "@/lib/recommendation-candidates";

const MAX_SEED_TITLES = 5;
const CAST_MEMBERS_PER_TITLE = 5;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const userId = session.user.id;

  const likedRatings = await prisma.rating.findMany({
    where: { userId, score: { gte: LIKED_THRESHOLD } },
    include: { title: true },
    orderBy: { score: "desc" },
    take: MAX_SEED_TITLES,
  });

  if (likedRatings.length === 0) {
    return NextResponse.json({ recommendations: [], reason: "no_liked_titles" });
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

  return NextResponse.json({
    recommendations,
    seedTitles: likedRatings.map((r) => ({ title: r.title.title, score: r.score })),
  });
}
