// TMDB's genre ids are a fixed, well-documented part of the API — not
// something we look up at runtime. Hardcoding the common ones here is
// simpler than calling /genre/movie/list on every request just to
// resolve a name to an id that never changes.
export interface Genre {
  id: number;
  name: string;
}

export const MOVIE_GENRES: Genre[] = [
  { id: 28, name: "Action" },
  { id: 12, name: "Adventure" },
  { id: 16, name: "Animation" },
  { id: 35, name: "Comedy" },
  { id: 80, name: "Crime" },
  { id: 99, name: "Documentary" },
  { id: 18, name: "Drama" },
  { id: 14, name: "Fantasy" },
  { id: 27, name: "Horror" },
  { id: 10749, name: "Romance" },
  { id: 878, name: "Sci-Fi" },
  { id: 53, name: "Thriller" },
];

export function getGenreName(genreId: number): string | undefined {
  return MOVIE_GENRES.find((genre) => genre.id === genreId)?.name;
}
