"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * The search box itself is a Client Component (it needs to react to
 * typing), but the actual TMDB fetch + results rendering happens in the
 * Server Component page below, driven by the `?q=` URL param. That way:
 *   - search results are server-rendered (fast first paint, no client
 *     loading spinner flash)
 *   - the search is shareable/bookmarkable as a URL
 *   - TMDB's API key never reaches the browser
 */
export function SearchBox({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    // Debounce: wait for a pause in typing before updating the URL
    // (and therefore re-fetching), rather than firing a request on
    // every keystroke.
    const timeoutId = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (query.trim()) {
        params.set("q", query.trim());
      } else {
        params.delete("q");
      }
      router.replace(`/search?${params.toString()}`);
    }, 400);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when `query` changes
  }, [query]);

  return (
    <input
      type="search"
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="Search movies and TV shows…"
      autoFocus
      className="w-full rounded-md border border-border bg-surface-raised px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
    />
  );
}
