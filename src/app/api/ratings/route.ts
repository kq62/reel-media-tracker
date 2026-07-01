import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureTitleCached } from "@/lib/titles";

const mediaTypeSchema = z.enum(["movie", "tv"]);

// Half-star precision: 0.5, 1, 1.5, 2 ... up to 5.0 — ten possible
// values, matching the Letterboxd standard. The `refine` checks that
// score*2 is (very nearly) a whole number, since floats sent over JSON
// can land a hair off an exact multiple (e.g. 0.30000000000000004) due
// to ordinary floating-point representation — a small epsilon tolerance
// avoids rejecting valid half-star values for that reason alone.
const rateSchema = z.object({
  tmdbId: z.number().int().positive(),
  mediaType: mediaTypeSchema,
  score: z
    .number()
    .min(0.5)
    .max(5)
    .refine(
      (value) => Math.abs(value * 2 - Math.round(value * 2)) < 1e-6,
      "Score must be in half-star increments (0.5, 1, 1.5, ...)"
    ),
  comment: z.string().trim().max(2000).optional(),
});

async function requireUserId() {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

/**
 * Rate a title 0.5-5.0 stars, with an optional written comment. Rating
 * something you haven't explicitly added to the watchlist still works —
 * we upsert a "watched" WatchlistItem alongside the rating, since rating
 * a title implies you've watched it. This lets a user rate directly from
 * a detail page without a separate "add to watchlist" step first.
 */
export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const parsed = rateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { tmdbId, mediaType, score, comment } = parsed.data;
  // An empty/whitespace-only comment is treated as "no comment" rather
  // than stored as an empty string — keeps the dashboard's "has a
  // review" check (`comment ? ... : ...`) simple and unambiguous.
  const normalizedComment = comment && comment.length > 0 ? comment : null;

  await ensureTitleCached(mediaType, tmdbId);

  const [rating] = await prisma.$transaction([
    prisma.rating.upsert({
      where: { userId_tmdbId_mediaType: { userId, tmdbId, mediaType } },
      create: { userId, tmdbId, mediaType, score, comment: normalizedComment },
      update: { score, comment: normalizedComment, ratedAt: new Date() },
    }),
    prisma.watchlistItem.upsert({
      where: { userId_tmdbId_mediaType: { userId, tmdbId, mediaType } },
      create: {
        userId,
        tmdbId,
        mediaType,
        status: "watched",
        watchedAt: new Date(),
      },
      update: { status: "watched", watchedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ rating }, { status: 201 });
}

/** Remove a rating. Leaves the watchlist "watched" status untouched. */
export async function DELETE(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = z
    .object({
      tmdbId: z.coerce.number().int().positive(),
      mediaType: mediaTypeSchema,
    })
    .safeParse({
      tmdbId: url.searchParams.get("tmdbId"),
      mediaType: url.searchParams.get("mediaType"),
    });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { tmdbId, mediaType } = parsed.data;

  await prisma.rating
    .delete({
      where: { userId_tmdbId_mediaType: { userId, tmdbId, mediaType } },
    })
    .catch(() => null);

  return NextResponse.json({ success: true });
}
