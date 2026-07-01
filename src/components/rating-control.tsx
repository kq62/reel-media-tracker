"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MediaType } from "@/lib/tmdb";
import { StarIcon } from "@/components/icons/star-icon";

const STAR_COUNT = 5;
const STEP = 0.5; // half-star precision, à la Letterboxd

const SIZE_CONFIG = {
  lg: { star: "size-10", gap: "gap-1.5", textareaRows: 3 },
  sm: { star: "size-7", gap: "gap-1", textareaRows: 2 },
} as const;

/**
 * A row of five clickable star slots. Each star is its own element with
 * two clickable halves — so "half-star" isn't derived from pixel-math
 * across the whole row, it's driven by which physical half a pointer
 * actually enters. That side-steps the earlier centering bug (the star
 * SVG has transparent padding, so its visual center didn't line up with
 * the mathematical center of an equal-width slot) and naturally
 * enforces half-star precision at the same time.
 *
 * Rendered on top of a muted outline row, the filled accent row is
 * still clipped to a single `width: X%`, so visual smoothness at any
 * value comes for free — the layered-row trick from the quarter-star
 * version still applies; only the input mapping changed.
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

  const { star: starSizeClass, gap: gapClass, textareaRows } =
    SIZE_CONFIG[size];
  const displayValue = hoverValue ?? score ?? 0;
  const fillPercent = (displayValue / STAR_COUNT) * 100;

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
          className="relative inline-flex select-none"
          onMouseLeave={() => setHoverValue(null)}
        >
          {/* Muted outline row — the visual "bed" for the accent fill. */}
          <div className={`flex ${gapClass} text-border`} aria-hidden="true">
            {Array.from({ length: STAR_COUNT }).map((_, i) => (
              <StarIcon key={i} className={starSizeClass} />
            ))}
          </div>

          {/* Accent-filled row on top, clipped to fillPercent. */}
          <div
            className={`pointer-events-none absolute inset-0 flex ${gapClass} overflow-hidden text-accent transition-[width] duration-150 ease-out ${
              hoverValue !== null
                ? "drop-shadow-[0_0_8px_rgba(255,122,41,0.55)]"
                : ""
            }`}
            style={{ width: `${fillPercent}%` }}
            aria-hidden="true"
          >
            {Array.from({ length: STAR_COUNT }).map((_, i) => (
              <StarIcon key={i} className={`${starSizeClass} shrink-0`} />
            ))}
          </div>

          {/* Interactive layer: two invisible click/hover halves per star.
              Since each half is a real DOM element occupying a defined
              slot, "which value does the cursor correspond to" becomes a
              trivial DOM question rather than pixel math against a row
              whose stars have transparent padding at their edges. */}
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
