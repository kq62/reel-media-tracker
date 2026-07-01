import Image from "next/image";
import { tmdbImageUrl, type TmdbCastMember } from "@/lib/tmdb";

export function CastList({ cast }: { cast: TmdbCastMember[] }) {
  // Most titles have dozens of credited cast members; only the first
  // several are relevant for a "who's in this" glance.
  const topCast = cast.slice(0, 12);

  if (topCast.length === 0) {
    return <p className="text-sm text-muted">No cast information available.</p>;
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {topCast.map((member) => {
        const photoUrl = tmdbImageUrl(member.profile_path, "w185");
        return (
          <div key={member.id} className="w-24 shrink-0 text-center">
            <div className="relative aspect-square w-24 overflow-hidden rounded-full bg-surface-raised">
              {photoUrl ? (
                <Image
                  src={photoUrl}
                  alt={member.name}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-2xl text-muted">
                  ?
                </div>
              )}
            </div>
            <p className="mt-2 line-clamp-1 text-xs font-medium">
              {member.name}
            </p>
            <p className="line-clamp-1 text-[11px] text-muted">
              {member.character}
            </p>
          </div>
        );
      })}
    </div>
  );
}
