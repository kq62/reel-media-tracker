import Link from "next/link";
import { MOVIE_GENRES } from "@/lib/genres";

export function GenreFilterBar({
  selectedGenreId,
}: {
  selectedGenreId: number | null;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <FilterPill href="/browse" active={selectedGenreId === null}>
        Trending
      </FilterPill>
      {MOVIE_GENRES.map((genre) => (
        <FilterPill
          key={genre.id}
          href={`/browse?genre=${genre.id}`}
          active={selectedGenreId === genre.id}
        >
          {genre.name}
        </FilterPill>
      ))}
    </div>
  );
}

function FilterPill({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
        active
          ? "border-accent bg-accent text-accent-foreground"
          : "border-border bg-surface text-muted hover:border-accent hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}
