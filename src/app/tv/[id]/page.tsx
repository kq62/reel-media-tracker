import { MediaDetailPage } from "@/components/media-detail-page";

export default async function TvPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MediaDetailPage mediaType="tv" tmdbId={Number(id)} />;
}
