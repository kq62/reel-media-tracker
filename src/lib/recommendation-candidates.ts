import {
  getSimilarTitles,
  getRecommendedTitles,
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
import { getGenreName } from "@/lib/genres";

const MIN_VOTE_AVERAGE = 6.5;
const MIN_VOTE_COUNT = 100;

function isQualityTitle(item: TmdbSearchResult): boolean {
  return (
    item.vote_average >= MIN_VOTE_AVERAGE &&
    item.vote_count >= MIN_VOTE_COUNT &&
    item.poster_path !== null
  );
}

/**
 * Resolves genre_ids (integers from TMDB's list endpoints) to genre
 * names so we can score candidates against the user's taste profile
 * (which uses genre names from the Title cache). TMDB's list endpoints
 * return `genre_ids`, not `genres: [{id, name}]` — that fuller shape
 * only comes from the detail endpoint. We resolve locally using our
 * static genre list instead of fetching detail for every candidate.
 */
function resolveGenreNames(genreIds: number[]): string[] {
  return genreIds
    .map((id) => getGenreName(id))
    .filter((name): name is string => name !== undefined);
}

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

  // Fetch candidate pools from both endpoints in parallel.
  // /recommendations is editorially curated (better quality);
  // /similar is broader. Both are already cached at the fetch layer.
  const candidateArrays = await Promise.all(
    likedTitleData.flatMap((title) => [
      getRecommendedTitles(title.mediaType as MediaType, title.tmdbId),
      getSimilarTitles(title.mediaType as MediaType, title.tmdbId),
    ])
  );

  const seenCandidateKeys = new Set<string>();
  const candidates = candidateArrays.flat().filter((item) => {
    const key = `${item.media_type}-${item.id}`;
    if (seenKeys.has(key) || seenCandidateKeys.has(key)) return false;
    seenCandidateKeys.add(key);
    return isQualityTitle(item);
  });

  // Score candidates using data already on the list response — no
  // additional TMDB calls needed. TMDB's list endpoints return
  // `genre_ids` (integers) rather than `genres: [{id, name}]`, so we
  // resolve names locally. Cast isn't available on list responses at
  // all, so genre overlap alone drives the candidate score.
  // This is the key performance trade-off: going from ~40 parallel
  // detail fetches (one per candidate) to zero, at the cost of not
  // having cast overlap in candidate scoring — cast still matters in
  // the profile (built from seed title details), just not candidate side.
  const scored: ScoredTitle[] = candidates.map((item) => {
    const candidateGenres = resolveGenreNames(item.genre_ids ?? []);

    const { score, matchedGenres, matchedCast, matchedKeywords } =
      scoreCandidate(
        { genres: candidateGenres, cast: [], keywords: [] },
        profile
      );

    return {
      item: { ...item, title: getDisplayTitle(item) },
      score,
      matchedGenres,
      matchedCast,
      matchedKeywords,
    };
  });

  return rankRecommendations(scored, limit);
}
