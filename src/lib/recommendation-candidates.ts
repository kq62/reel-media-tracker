import {
  getSimilarTitles,
  getRecommendedTitles,
  getMediaDetail,
  getDisplayTitle,
  type TmdbSearchResult,
  type MediaType,
} from "@/lib/tmdb";
import {
  buildTasteProfile,
  scoreCandidate,
  rankRecommendations,
  type LikedTitleData,
  type ScoredTitle,
} from "@/lib/recommendations";

// Quality gates applied to every candidate before scoring.
// — MIN_VOTE_AVERAGE: anything below 6.5 is objectively poorly received;
//   6.5 is a reasonable "worth watching" floor without being too strict.
// — MIN_VOTE_COUNT: a film with 10 votes and a 10.0 average is
//   statistically meaningless — we require at least 100 votes so the
//   rating reflects real audience opinion, not a handful of fans.
// — MUST_HAVE_POSTER: titles without a poster are almost always
//   obscure, direct-to-video, or incomplete TMDB entries — filtering
//   them out significantly improves the visual quality of the list.
const MIN_VOTE_AVERAGE = 6.5;
const MIN_VOTE_COUNT = 100;

function isQualityTitle(item: TmdbSearchResult): boolean {
  return (
    item.vote_average >= MIN_VOTE_AVERAGE &&
    item.vote_count >= MIN_VOTE_COUNT &&
    item.poster_path !== null
  );
}

const CAST_MEMBERS_PER_TITLE = 5;

export async function gatherAndScoreCandidates({
  likedTitleData,
  seenKeys,
  limit,
}: {
  likedTitleData: LikedTitleData[];
  seenKeys: Set<string>;
  limit: number;
}): Promise<ScoredTitle[]> {
  const profile = buildTasteProfile(likedTitleData);

  // Use both /recommendations (curated, higher quality) and /similar
  // (broader) for each seed, then merge+dedupe. The recommendations
  // endpoint gives better results by itself but has a narrower pool;
  // similar fills it out. Both are fetched in parallel.
  const candidateArrays = await Promise.all(
    likedTitleData.flatMap((title) => [
      getRecommendedTitles(title.mediaType as MediaType, title.tmdbId),
      getSimilarTitles(title.mediaType as MediaType, title.tmdbId),
    ])
  );

  const seenCandidateKeys = new Set<string>();
  const candidates = candidateArrays
    .flat()
    .filter((item) => {
      const key = `${item.media_type}-${item.id}`;
      if (seenKeys.has(key) || seenCandidateKeys.has(key)) return false;
      seenCandidateKeys.add(key);
      // Apply quality filter here — before the detail fetch —
      // so we skip the TMDB detail call entirely for low-quality titles.
      return isQualityTitle(item);
    });

  const scored: ScoredTitle[] = await Promise.all(
    candidates.map(async (item) => {
      let candidateGenres: string[] = [];
      let candidateCast: string[] = [];
      try {
        const detail = await getMediaDetail(item.media_type, item.id);
        candidateGenres = detail.genres.map((g) => g.name);
        candidateCast = detail.credits.cast
          .slice(0, CAST_MEMBERS_PER_TITLE)
          .map((m) => m.name);
      } catch {
        // skip failed candidates silently
      }
      const { score, matchedGenres, matchedCast, matchedKeywords } =
        scoreCandidate(
          { genres: candidateGenres, cast: candidateCast, keywords: [] },
          profile
        );
      return {
        item: { ...item, title: getDisplayTitle(item) },
        score,
        matchedGenres,
        matchedCast,
        matchedKeywords,
      };
    })
  );

  return rankRecommendations(scored, limit);
}
