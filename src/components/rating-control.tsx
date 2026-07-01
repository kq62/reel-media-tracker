"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MediaType } from "@/lib/tmdb";
import { StarIcon } from "@/components/icons/star-icon";

const STAR_COUNT = 5;
const STEP = 0.5; // half-star precision, à la Letterboxd

const SIZE_CONFIG = {
  lg: { star: "size-10", gap: "gap-1", textareaRows: 3 },
  sm: { star: "size-7", gap: "gap-0.5", textareaRows: 2 },
} as const;

/**
 * Per-star fill: each of the five stars renders its own outline and
 * (if partially or fully filled) a clipped orange copy on top. The clip
 * width is the star's *individual* fill fraction (0, 0.5, or 1) — not
 * a percentage of the whole row. That side-steps every alignment bug
 * the earlier "one big clipped row" approach ran into:
 *
 *   1. The star SVG has natural padding inside its 24x24 viewBox (the
 *      path only spans roughly x=2.5 to x=21.5). In the old approach,
 *      when the total row was clipped at 90% for a 4.5 rating, the
 *      absolute pixel position of the clip fell inside star 5's
 *      invisible left-edge padding, so less than half of the *visible*
 *      star showed as filled. Doing the clip per-star means each star's
 *      fill is centered on its own visible geometry — a 50% clip on
 *      star 5 shows exactly half of star 5's *visible* shape.
 *
 *   2. Gaps between stars no longer break the math — the fill math
 *      per star doesn't depend on where the star sits in the row.
 *
 * The interactive layer is still one row of 10 half-buttons overlaid
 * on the whole widget, so hover/click detection is trivial DOM entry
 * events, not pixel math.
 */
export function RatingControl({
  tmdbId,
  mediaType,
  initialScore,
  initialComment = null,
  isAuthenticated,
  size = "lg",
}: {
  tmdbId: number;
  mediaType: MediaType;
  initialScore: number | null;
  initialComment?: string | null;
  isAuthenticated: boolean;
  size?: "lg" | "sm";
}) {
  const router = useRouter();
  const [score, setScore] = useState<number | null>(initialScore);
  const [comment, setComment] = useState<string | null>(initialComment);
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const [isEditingComment, setIsEditingComment] = useState(false);
  const [commentDraft, setCommentDraft] = useState(initialComment ?? "");
  const [isPending, startTransition] = useTransition();

  const { star: starSizeClass, gap: gapClass, textareaRows } = SIZE_CONFIG[size];
  const displayValue = hoverValue ?? score ?? 0;

  async function submitRating(value: number, commentToSend: string | null) {
    if (!isAuthenticated) {
      router.push("/login");
      return false;
    }
    const response = await fetch("/api/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tmdbId,
        mediaType,
        score: value,
        comment: commentToSend ?? undefined,
      }),
    });
    if (response.ok) {
      startTransition(() => router.refresh());
    }
    return response.ok;
  }

  function handleHalfClick(value: number) {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    const clamped = Math.max(STEP, Math.min(STAR_COUNT, value));
    setScore(clamped); // optimistic
    submitRating(clamped, comment).then((ok) => {
      if (!ok) setScore(initialScore);
    });
  }

  async function removeRating() {
    setScore(null);
    setComment(null);
    setCommentDraft("");
    const response = await fetch(
      `/api/ratings?tmdbId=${tmdbId}&mediaType=${mediaType}`,
      { method: "DELETE" }
    );
    if (response.ok) {
      startTransition(() => router.refresh());
    }
  }

  async function saveComment() {
    if (score === null) return;
    const trimmed = commentDraft.trim();
    setComment(trimmed || null);
    setIsEditingComment(false);
    await submitRating(score, trimmed || null);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-4">
        <div
          className={`relative flex select-none ${gapClass}`}
          onMouseLeave={() => setHoverValue(null)}
        >
          {Array.from({ length: STAR_COUNT }).map((_, i) => {
            const starIndex = i + 1;
            // How full is *this* individual star, on a 0-1 scale?
            let fillFraction = 0;
            if (displayValue >= starIndex) {
              fillFraction = 1;
            } else if (displayValue > starIndex - 1) {
              fillFraction = displayValue - (starIndex - 1);
            }

            return (
              <div key={i} className={`relative ${starSizeClass}`}>
                {/* Outline star — the "bed" underneath. */}
                <StarIcon
                  className={`${starSizeClass} text-border`}
                />
                {/* Filled star clipped to this individual star's fill. */}
                {fillFraction > 0 && (
                  <div
                    className={`pointer-events-none absolute inset-0 overflow-hidden text-accent transition-[width] duration-150 ease-out ${
                      hoverValue !== null
                        ? "drop-shadow-[0_0_8px_rgba(255,122,41,0.55)]"
                        : ""
                    }`}
                    style={{ width: `${fillFraction * 100}%` }}
                    aria-hidden="true"
                  >
                    <StarIcon className={starSizeClass} />
                  </div>
                )}
              </div>
            );
          })}

          {/* Interactive overlay — one row of 10 half-buttons matching
              the star layout exactly (including the gap between stars),
              so cursor-to-value mapping is "which half did the pointer
              enter", never pixel math. */}
          <div
            className={`absolute inset-0 flex ${gapClass}`}
            role="slider"
            aria-label="Rating out of 5 stars"
            aria-valuemin={0}
            aria-valuemax={5}
            aria-valuenow={score ?? 0}
          >
            {Array.from({ length: STAR_COUNT }).map((_, starIndex) => {
              const leftHalfValue = starIndex + 0.5;
              const rightHalfValue = starIndex + 1;
              return (
                <div
                  key={starIndex}
                  className={`flex ${starSizeClass} shrink-0`}
                >
                  <button
                    type="button"
                    aria-label={`Rate ${leftHalfValue} stars`}
                    onMouseEnter={() => setHoverValue(leftHalfValue)}
                    onClick={() => handleHalfClick(leftHalfValue)}
                    className="h-full w-1/2 cursor-pointer"
                  />
                  <button
                    type="button"
                    aria-label={`Rate ${rightHalfValue} stars`}
                    onMouseEnter={() => setHoverValue(rightHalfValue)}
                    onClick={() => handleHalfClick(rightHalfValue)}
                    className="h-full w-1/2 cursor-pointer"
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm">
            {score !== null ? (
              <>
                <span className="font-semibold text-foreground">
                  {score.toFixed(1).replace(/\.0$/, "")}
                </span>
                <span className="text-muted"> / 5</span>
              </>
            ) : (
              <span className="text-muted">Not rated</span>
            )}
          </span>

          {score !== null && (
            <button
              onClick={removeRating}
              disabled={isPending}
              className="text-xs text-muted hover:text-foreground"
            >
              Clear rating
            </button>
          )}
        </div>
      </div>

      {score !== null && !isEditingComment && (
        <div>
          {comment ? (
            <div>
              <p className="text-sm italic text-muted">&ldquo;{comment}&rdquo;</p>
              <button
                onClick={() => {
                  setCommentDraft(comment);
                  setIsEditingComment(true);
                }}
                className="mt-1 text-xs text-accent hover:underline"
              >
                Edit review
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditingComment(true)}
              className="text-xs text-accent hover:underline"
            >
              + Add a review
            </button>
          )}
        </div>
      )}

      {score !== null && isEditingComment && (
        <div className="max-w-md space-y-2">
          <textarea
            value={commentDraft}
            onChange={(e) => setCommentDraft(e.target.value)}
            rows={textareaRows}
            maxLength={2000}
            placeholder="What did you think?"
            className="w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <div className="flex gap-2">
            <button
              onClick={saveComment}
              className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground hover:opacity-90"
            >
              Save review
            </button>
            <button
              onClick={() => {
                setIsEditingComment(false);
                setCommentDraft(comment ?? "");
              }}
              className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-surface-raised"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
