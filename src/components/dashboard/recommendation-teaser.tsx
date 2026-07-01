import Image from "next/image";
import Link from "next/link";
import { tmdbImageUrl } from "@/lib/tmdb";
import type { ScoredTitle } from "@/lib/recommendations";

export function RecommendationTeaser({
  recommendations,
}: {
  recommendations: ScoredTitle[];
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recommended for You</h2>
        <Link
          href="/recommendations"
          className="text-sm text-accent hover:underline"
        >
          See all →
        </Link>
      </div>
      <p className="mt-1 text-xs text-muted">
        Based on your highest-rated titles
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {recommendations.slice(0, 4).map(({ item, matchedGenres }) => {
          const posterUrl = tmdbImageUrl(item.poster_path, "w342");
          return (
            <Link
              key={`${item.media_type}-${item.id}`}
              href={`/${item.media_type}/${item.id}`}
              className="group overflow-hidden rounded-lg border border-border bg-surface-raised transition hover:border-accent"
            >
              <div className="relative aspect-[2/3] w-full bg-surface">
                {posterUrl ? (
                  <Image
                    src={posterUrl}
                    alt={item.title ?? ""}
                    fill
                    sizes="(min-width: 640px) 25vw, 50vw"
                    className="object-cover transition group-hover:opacity-90"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted">
                    No poster
                  </div>
                )}
              </div>
              <div className="p-2">
                <p className="line-clamp-1 text-xs font-semibold">
                  {item.title}
                </p>
                {matchedGenres[0] && (
                  <p className="mt-0.5 text-[10px] text-accent">
                    {matchedGenres[0]}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
