import type { TmdbVideo } from "@/lib/tmdb";

function pickBestVideo(videos: TmdbVideo[]): TmdbVideo | null {
  const youtubeVideos = videos.filter((v) => v.site === "YouTube");
  return (
    youtubeVideos.find((v) => v.type === "Trailer") ??
    youtubeVideos.find((v) => v.type === "Teaser") ??
    youtubeVideos[0] ??
    null
  );
}

export function TrailerEmbed({ videos }: { videos: TmdbVideo[] }) {
  const video = pickBestVideo(videos);

  if (!video) {
    return <p className="text-sm text-muted">No trailer available.</p>;
  }

  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg border border-border">
      <iframe
        src={`https://www.youtube.com/embed/${video.key}`}
        title="Trailer"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="h-full w-full"
      />
    </div>
  );
}
