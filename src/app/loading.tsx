// Next.js shows this file automatically while a page's async server
// component is rendering — no Suspense wrapper needed at the page level.
// A generic skeleton here means every page gets a loading state for free,
// even pages we haven't added page-specific skeletons to.
export default function GlobalLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Page heading placeholder */}
      <div className="space-y-2">
        <div className="h-7 w-48 rounded-md bg-surface-raised" />
        <div className="h-4 w-72 rounded-md bg-surface-raised" />
      </div>

      {/* Content block placeholders — generic enough to fit any page */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="aspect-[2/3] rounded-lg bg-surface-raised" />
        ))}
      </div>
    </div>
  );
}
