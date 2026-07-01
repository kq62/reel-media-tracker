import type { GenreCount } from "@/lib/genre-stats";

export function GenreStatsCloud({
  counts,
  watchedCount,
}: {
  counts: GenreCount[];
  watchedCount: number;
}) {
  if (counts.length === 0) {
    return (
      <p className="text-sm text-muted">
        Mark a few titles as watched to see your most-watched genres here.
      </p>
    );
  }

  const top = counts.slice(0, 10);
  const max = top[0].count;
  // Only call out a "leading" genre once there's actual separation in
  // the data (max > 1) — with a small or varied watch history, every
  // genre can easily tie at 1. Highlighting an arbitrary tied genre as
  // if it were your favorite would be misleading, so the neutral style
  // applies uniformly until something genuinely pulls ahead.
  const hasLeader = max > 1;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        Based on {watchedCount} watched title{watchedCount === 1 ? "" : "s"}.
      </p>
      <div className="flex flex-wrap gap-2">
        {top.map(({ genre, count }) => {
          const isLeading = hasLeader && count === max;
          return (
            <span
              key={genre}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${
                isLeading
                  ? "border-accent bg-accent/15 font-semibold text-foreground"
                  : "border-border bg-surface text-muted"
              }`}
            >
              {genre}
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs ${
                  isLeading
                    ? "bg-accent text-accent-foreground"
                    : "bg-surface-raised text-muted"
                }`}
              >
                {count}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
