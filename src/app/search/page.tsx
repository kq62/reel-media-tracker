import { Suspense } from "react";
import { searchMedia } from "@/lib/tmdb";
import { SearchBox } from "@/components/search-box";
import { MediaCard } from "@/components/media-card";
import { EmptyState } from "@/components/empty-state";

export const metadata = {
  title: "Search — Reel",
};

async function SearchResults({ query }: { query: string }) {
  if (!query) {
    return (
      <EmptyState
        title="Start typing to search"
        description="Find movies and TV shows by title."
      />
    );
  }

  let results;
  try {
    results = await searchMedia(query);
  } catch (error) {
    console.error("TMDB search failed:", error);
    return (
      <EmptyState
        title="Search is unavailable right now"
        description="Double-check your TMDB_API_KEY is set, then try again."
      />
    );
  }

  if (results.length === 0) {
    return (
      <EmptyState
        title={`No results for "${query}"`}
        description="Try a different title or check the spelling."
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
      {results.map((item) => (
        <div key={`${item.media_type}-${item.id}`} className="poster-reveal">
          <MediaCard item={item} />
        </div>
      ))}
    </div>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Search</h1>
        <div className="mt-4 max-w-md">
          <SearchBox initialQuery={query} />
        </div>
      </div>

      {/* Suspense + key forces a fresh loading state per query, since
          this is an async Server Component reading the URL. */}
      <Suspense key={query} fallback={<SearchResultsSkeleton />}>
        <SearchResults query={query} />
      </Suspense>
    </div>
  );
}

function SearchResultsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="aspect-[2/3] animate-pulse rounded-lg bg-surface-raised"
        />
      ))}
    </div>
  );
}
