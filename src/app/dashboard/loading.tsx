export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-10">
      <div className="space-y-2">
        <div className="h-7 w-44 rounded-md bg-surface-raised" />
        <div className="h-4 w-48 rounded-md bg-surface-raised" />
      </div>

      {/* Genre stats placeholder */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="mb-3 h-5 w-40 rounded bg-surface-raised" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-7 w-20 rounded-full bg-surface-raised" />
          ))}
        </div>
      </div>

      {/* Watchlist cards placeholder */}
      <div>
        <div className="mb-4 h-5 w-32 rounded bg-surface-raised" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex gap-4 rounded-xl border border-border bg-surface p-4"
            >
              <div className="aspect-[2/3] w-24 shrink-0 rounded-lg bg-surface-raised" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3 w-12 rounded bg-surface-raised" />
                <div className="h-4 w-full rounded bg-surface-raised" />
                <div className="h-4 w-2/3 rounded bg-surface-raised" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
