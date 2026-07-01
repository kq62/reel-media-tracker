import { MediaDetailPage } from "@/components/media-detail-page";

export default async function MoviePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MediaDetailPage mediaType="movie" tmdbId={Number(id)} />;
}
