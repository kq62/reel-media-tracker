import type { GenreCount } from "@/lib/genre-stats";

export function GenreStatsBars({ counts }: { counts: GenreCount[] }) {
  if (counts.length === 0) {
    return (
      <p className="text-sm text-muted">
        Mark a few titles as watched to see your most-watched genres here.
      </p>
    );
  }

  const top = counts.slice(0, 5);
  const max = top[0].count;

  return (
    <div className="space-y-2">
      {top.map(({ genre, count }) => (
        <div key={genre} className="flex items-center gap-3">
          <span className="w-28 shrink-0 truncate text-sm">{genre}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-raised">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${(count / max) * 100}%` }}
            />
          </div>
          <span className="w-6 shrink-0 text-right text-sm text-muted">
            {count}
          </span>
        </div>
      ))}
    </div>
  );
}
