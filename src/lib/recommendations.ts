import type { TmdbSearchResult } from "@/lib/tmdb";

// Only titles rated at or above this threshold feed into the taste
// profile. Below 3.5 stars, the user didn't enjoy it enough for us to
// use it as a positive signal — including weak ratings would pull the
// profile toward genres the user actually dislikes.
export const LIKED_THRESHOLD = 3.5;

// Weights control how much each signal contributes to the final score.
// Genre overlap is weighted highest because it's the most reliable
// signal from what TMDB actually stores — genres are consistently tagged
// across the entire catalogue. Cast overlap is a meaningful secondary
// signal (people often follow actors/directors they enjoy), and keyword
// overlap adds thematic specificity on top.
const WEIGHTS = {
  genre: 3,
  cast: 2,
  keyword: 1,
} as const;

export interface TasteProfile {
  // Maps genre/castMember/keyword name → weighted frequency count.
  // Weighted because a title rated 5 stars should contribute more to the
  // profile than one rated 3.5 — we multiply each signal's count by the
  // rating's score as a simple weight so higher-rated titles pull the
  // profile more strongly toward their characteristics.
  genres: Map<string, number>;
  castMembers: Map<string, number>; // keyed by cast member name
  keywords: Map<string, number>;
}

export interface ScoredTitle {
  item: TmdbSearchResult;
  score: number;
  // These help the UI explain why something was recommended —
  // "Because you liked Drama, Crime" is more useful than a raw number.
  matchedGenres: string[];
  matchedCast: string[];
  matchedKeywords: string[];
}

export interface LikedTitleData {
  tmdbId: number;
  mediaType: "movie" | "tv";
  score: number; // 0.5-5.0 user rating
  genres: string[]; // from our local Title cache
  cast: string[]; // top cast member names, fetched from TMDB
  keywords: string[]; // keyword names, fetched from TMDB
}

/**
 * Builds a weighted taste profile from a list of liked titles. The
 * profile is a frequency map for each signal type: if the user has
 * rated three Action movies highly (4, 4.5, 5 stars), "Action" will
 * appear with a cumulative weight of 4+4.5+5 = 13.5 in the genre map.
 *
 * Using weighted frequency rather than a simple boolean ("user likes
 * Action: yes/no") means the scoring step naturally treats consistently
 * high-rated genres as stronger signals than a genre that only appeared
 * once in the liked set.
 */
export function buildTasteProfile(likedTitles: LikedTitleData[]): TasteProfile {
  const genres = new Map<string, number>();
  const castMembers = new Map<string, number>();
  const keywords = new Map<string, number>();

  for (const title of likedTitles) {
    const weight = title.score; // higher rating = more influence on profile

    for (const genre of title.genres) {
      genres.set(genre, (genres.get(genre) ?? 0) + weight);
    }
    for (const member of title.cast) {
      castMembers.set(member, (castMembers.get(member) ?? 0) + weight);
    }
    for (const keyword of title.keywords) {
      keywords.set(keyword, (keywords.get(keyword) ?? 0) + weight);
    }
  }

  return { genres, castMembers, keywords };
}

/**
 * Scores a single candidate title against the user's taste profile.
 *
 * The score is a weighted sum: each genre/cast/keyword the candidate
 * shares with the profile contributes its profile weight multiplied by
 * the signal's base weight constant. This means:
 *   - Sharing a genre the user has consistently rated highly scores more
 *     than sharing a genre that only appeared once.
 *   - Cast overlap (weight 2) contributes less than genre overlap (3)
 *     per unit, but a title sharing three cast members can still
 *     outscore one that only shares one genre.
 *
 * The returned matchedGenres/matchedCast/matchedKeywords arrays are
 * used by the UI to explain the recommendation rather than just showing
 * a score — "Because you liked Action, Crime" is more useful to a
 * user than knowing the raw similarity score.
 */
export function scoreCandidate(
  candidate: {
    genres: string[];
    cast: string[];
    keywords: string[];
  },
  profile: TasteProfile
): { score: number; matchedGenres: string[]; matchedCast: string[]; matchedKeywords: string[] } {
  let score = 0;
  const matchedGenres: string[] = [];
  const matchedCast: string[] = [];
  const matchedKeywords: string[] = [];

  for (const genre of candidate.genres) {
    const profileWeight = profile.genres.get(genre) ?? 0;
    if (profileWeight > 0) {
      score += WEIGHTS.genre * profileWeight;
      matchedGenres.push(genre);
    }
  }

  for (const member of candidate.cast) {
    const profileWeight = profile.castMembers.get(member) ?? 0;
    if (profileWeight > 0) {
      score += WEIGHTS.cast * profileWeight;
      matchedCast.push(member);
    }
  }

  for (const keyword of candidate.keywords) {
    const profileWeight = profile.keywords.get(keyword) ?? 0;
    if (profileWeight > 0) {
      score += WEIGHTS.keyword * profileWeight;
      matchedKeywords.push(keyword);
    }
  }

  return { score, matchedGenres, matchedCast, matchedKeywords };
}

/**
 * Ranks a list of pre-scored candidates and returns the top N,
 * filtering out zero-score results (titles that share nothing with the
 * user's taste profile — these would be random noise, not real
 * recommendations).
 */
export function rankRecommendations(
  scored: ScoredTitle[],
  limit: number = 20
): ScoredTitle[] {
  return scored
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
