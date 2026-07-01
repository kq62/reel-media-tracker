import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureTitleCached } from "@/lib/titles";

const mediaTypeSchema = z.enum(["movie", "tv"]);

const addSchema = z.object({
  tmdbId: z.number().int().positive(),
  mediaType: mediaTypeSchema,
});

const statusSchema = z.object({
  tmdbId: z.number().int().positive(),
  mediaType: mediaTypeSchema,
  status: z.enum(["planned", "watched"]),
});

async function requireUserId() {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

/** Add a title to the signed-in user's watchlist as "planned". */
export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const parsed = addSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { tmdbId, mediaType } = parsed.data;

  // Caching the title here (rather than trusting client-sent metadata)
  // means this route works identically whether it's called from the
  // detail page or a quick-add button on a search/browse card — neither
  // needs to know or send anything beyond the id.
  await ensureTitleCached(mediaType, tmdbId);

  const item = await prisma.watchlistItem.upsert({
    where: { userId_tmdbId_mediaType: { userId, tmdbId, mediaType } },
    create: { userId, tmdbId, mediaType, status: "planned" },
    update: {}, // already on the watchlist — no-op, not an error
  });

  return NextResponse.json({ item }, { status: 201 });
}

/** Update a watchlist item's status (planned <-> watched). */
export async function PATCH(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const parsed = statusSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { tmdbId, mediaType, status } = parsed.data;

  const item = await prisma.watchlistItem.update({
    where: { userId_tmdbId_mediaType: { userId, tmdbId, mediaType } },
    data: {
      status,
      watchedAt: status === "watched" ? new Date() : null,
    },
  });

  return NextResponse.json({ item });
}

/** Remove a title from the watchlist entirely. */
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

  // Deleting something that isn't there is treated as success — the end
  // state the caller wants (this title isn't on the watchlist) is
  // already true, so there's nothing exceptional to report.
  await prisma.watchlistItem
    .delete({
      where: { userId_tmdbId_mediaType: { userId, tmdbId, mediaType } },
    })
    .catch(() => null);

  return NextResponse.json({ success: true });
}
