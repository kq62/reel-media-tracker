import { notFound } from "next/navigation";
import Image from "next/image";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getMediaDetail,
  getDisplayTitle,
  tmdbImageUrl,
  type MediaType,
} from "@/lib/tmdb";
import {
  DEFAULT_REGION,
  REGION_COOKIE_NAME,
  isSupportedRegion,
  type RegionCode,
} from "@/lib/regions";
import { getUserMediaState } from "@/lib/user-media-state";
import { RegionSelector } from "@/components/region-selector";
import { CastList } from "@/components/cast-list";
import { TrailerEmbed } from "@/components/trailer-embed";
import { WatchProviders } from "@/components/watch-providers";
import { WatchlistButton } from "@/components/watchlist-button";
import { RatingControl } from "@/components/rating-control";

/**
 * Shared between /movie/[id] and /tv/[id] since the two pages differ
 * only in which TMDB endpoint they hit and a couple of field names
 * (title vs name, release_date vs first_air_date) — everything else
 * about the layout is identical, so duplicating it into two near-copies
 * would just be two places to keep in sync.
 */
export async function MediaDetailPage({
  mediaType,
  tmdbId,
}: {
  mediaType: MediaType;
  tmdbId: number;
}) {
  const cookieStore = await cookies();
  const cookieRegion = cookieStore.get(REGION_COOKIE_NAME)?.value;
  const region: RegionCode =
    cookieRegion && isSupportedRegion(cookieRegion)
      ? cookieRegion
      : DEFAULT_REGION;

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;

  let detail;
  try {
    detail = await getMediaDetail(mediaType, tmdbId);
  } catch {
    notFound();
  }

  const { watchlistStatus, score, comment } = await getUserMediaState(
    userId,
    mediaType,
    tmdbId
  );

  const title = getDisplayTitle(detail);
  const year = (detail.release_date || detail.first_air_date)?.slice(0, 4);
  const backdropUrl = tmdbImageUrl(detail.backdrop_path, "original");
  const posterUrl = tmdbImageUrl(detail.poster_path, "w500");
  const runtimeMinutes = detail.runtime ?? detail.episode_run_time?.[0];
  const providersForRegion = detail["watch/providers"]?.results?.[region];

  return (
    <div className="space-y-10">
      {/* Hero: backdrop with poster + key info overlaid */}
      <div className="relative -mx-4 overflow-hidden sm:mx-0 sm:rounded-xl">
        {backdropUrl && (
          <div className="absolute inset-0">
            <Image
              src={backdropUrl}
              alt=""
              fill
              sizes="100vw"
              className="object-cover opacity-30"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
          </div>
        )}

        <div className="relative flex flex-col gap-5 px-4 py-8 sm:flex-row sm:px-8">
          {posterUrl && (
            <Image
              src={posterUrl}
              alt={title}
              width={180}
              height={270}
              className="rounded-lg border border-border shadow-lg"
            />
          )}
          <div className="flex flex-col justify-end gap-3">
            <div>
              <h1 className="text-3xl font-bold">{title}</h1>
              <p className="mt-1 text-sm text-muted">
                {[
                  year,
                  runtimeMinutes ? `${runtimeMinutes} min` : null,
                  detail.genres.map((g) => g.name).join(", "),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <p className="mt-1 text-sm text-accent">
                ★ {detail.vote_average.toFixed(1)} / 10
              </p>
            </div>

            <WatchlistButton
              tmdbId={tmdbId}
              mediaType={mediaType}
              initialStatus={watchlistStatus}
              isAuthenticated={Boolean(userId)}
            />
          </div>
        </div>
      </div>

      <section>
        <h2 className="text-lg font-semibold">Synopsis</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
          {detail.overview || "No synopsis available."}
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Your rating</h2>
        <div className="mt-3">
          <RatingControl
            tmdbId={tmdbId}
            mediaType={mediaType}
            initialScore={score}
            initialComment={comment}
            isAuthenticated={Boolean(userId)}
            size="lg"
          />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Cast</h2>
        <div className="mt-3">
          <CastList cast={detail.credits.cast} />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Trailer</h2>
        <div className="mt-3 max-w-2xl">
          <TrailerEmbed videos={detail.videos.results} />
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Where to watch</h2>
          <RegionSelector currentRegion={region} />
        </div>
        <div className="mt-3">
          <WatchProviders providers={providersForRegion} />
        </div>
      </section>
    </div>
  );
}
