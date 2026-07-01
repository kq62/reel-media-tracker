export interface GenreCount {
  genre: string;
  count: number;
}

/**
 * Counts how often each genre appears across a list of titles (e.g. the
 * user's watched titles) and returns them sorted most-frequent first.
 * Kept as a plain, easily-unit-testable function rather than inline in
 * the dashboard page.
 */
export function computeGenreCounts(
  titles: { genres: string[] }[]
): GenreCount[] {
  const counts = new Map<string, number>();
  for (const title of titles) {
    for (const genre of title.genres) {
      counts.set(genre, (counts.get(genre) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count);
}
