export default function MovieLoading() {
  return (
    <div className="animate-pulse space-y-10">
      {/* Hero skeleton */}
      <div className="relative -mx-4 h-64 overflow-hidden rounded-xl bg-surface-raised sm:mx-0">
        <div className="absolute bottom-6 left-6 flex gap-5">
          <div className="h-40 w-28 rounded-lg bg-surface" />
          <div className="flex flex-col justify-end gap-2">
            <div className="h-7 w-56 rounded bg-surface" />
            <div className="h-4 w-40 rounded bg-surface" />
          </div>
        </div>
      </div>
      {/* Sections */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="h-5 w-24 rounded bg-surface-raised" />
          <div className="space-y-2">
            <div className="h-4 w-full rounded bg-surface-raised" />
            <div className="h-4 w-5/6 rounded bg-surface-raised" />
            <div className="h-4 w-4/6 rounded bg-surface-raised" />
          </div>
        </div>
      ))}
    </div>
  );
}
