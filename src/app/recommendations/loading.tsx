export default function RecommendationsLoading() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="space-y-2">
        <div className="h-7 w-56 rounded-md bg-surface-raised" />
        <div className="h-4 w-80 rounded-md bg-surface-raised" />
      </div>

      {/* Seed titles placeholder */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="mb-2 h-3 w-32 rounded bg-surface-raised" />
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-7 w-28 rounded-full bg-surface-raised" />
          ))}
        </div>
      </div>

      {/* Recommendation cards placeholder */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex gap-3 rounded-xl border border-border bg-surface p-3"
          >
            <div className="aspect-[2/3] w-20 shrink-0 rounded-lg bg-surface-raised" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-3 w-12 rounded bg-surface-raised" />
              <div className="h-4 w-full rounded bg-surface-raised" />
              <div className="h-4 w-3/4 rounded bg-surface-raised" />
              <div className="h-3 w-16 rounded bg-surface-raised" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
