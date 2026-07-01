import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { tmdbImageUrl } from "@/lib/tmdb";

/**
 * A card (not a thin horizontal row, despite the filename staying for
 * minimal churn) — poster on the left at a real size, title/meta/controls
 * stacked to the right with room to breathe. Meant to sit inside a
 * responsive grid (see app/dashboard/page.tsx) rather than a single
 * full-width vertical stack, so it doesn't end up squeezed into a thin
 * strip the way the original row layout did.
 */
export function DashboardItemRow({
  tmdbId,
  mediaType,
  title,
  posterPath,
  children,
}: {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath: string | null;
  children: ReactNode;
}) {
  const posterUrl = tmdbImageUrl(posterPath, "w185");

  return (
    <div className="flex gap-4 rounded-xl border border-border bg-surface p-4 transition hover:border-accent/40">
      <Link
        href={`/${mediaType}/${tmdbId}`}
        className="relative aspect-[2/3] w-24 shrink-0 overflow-hidden rounded-lg bg-surface-raised sm:w-28"
      >
        {posterUrl ? (
          <Image
            src={posterUrl}
            alt={title}
            fill
            sizes="112px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-2 text-center text-[10px] text-muted">
            No poster
          </div>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          {mediaType === "tv" ? "TV Show" : "Movie"}
        </span>
        <Link
          href={`/${mediaType}/${tmdbId}`}
          className="mt-0.5 line-clamp-2 text-base font-semibold hover:text-accent"
        >
          {title}
        </Link>
        <div className="mt-auto pt-3">{children}</div>
      </div>
    </div>
  );
}
