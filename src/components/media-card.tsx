import Image from "next/image";
import Link from "next/link";
import {
  getDisplayTitle,
  getReleaseYear,
  tmdbImageUrl,
  type TmdbSearchResult,
} from "@/lib/tmdb";
import { WatchlistQuickAddButton } from "@/components/watchlist-quick-add-button";

export function MediaCard({ item }: { item: TmdbSearchResult }) {
  const title = getDisplayTitle(item);
  const year = getReleaseYear(item);
  const posterUrl = tmdbImageUrl(item.poster_path, "w342");

  return (
    <Link
      href={`/${item.media_type}/${item.id}`}
      className="group block overflow-hidden rounded-lg border border-border bg-surface transition duration-200 ease-out hover:-translate-y-1.5 hover:scale-[1.02] hover:border-accent hover:shadow-lg hover:shadow-accent/20"
    >
      <div className="relative aspect-[2/3] w-full bg-surface-raised">
        {posterUrl ? (
          <Image
            src={posterUrl}
            alt={title}
            fill
            sizes="(min-width: 1024px) 200px, 45vw"
            className="object-cover transition group-hover:opacity-90"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-3 text-center text-xs text-muted">
            No poster available
          </div>
        )}
        <span className="absolute top-2 left-2 rounded bg-background/80 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
          {item.media_type === "tv" ? "TV" : "Movie"}
        </span>
        <WatchlistQuickAddButton tmdbId={item.id} mediaType={item.media_type} />
      </div>
      <div className="p-3">
        <h3 className="line-clamp-1 text-sm font-semibold">{title}</h3>
        <p className="mt-0.5 text-xs text-muted">{year ?? "—"}</p>
      </div>
    </Link>
  );
}
