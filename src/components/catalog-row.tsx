"use client";

import { useRef } from "react";
import { MediaCard } from "@/components/media-card";
import type { TmdbSearchResult } from "@/lib/tmdb";

const SCROLL_AMOUNT = 600;

export function CatalogRow({
  title,
  items,
}: {
  title: string;
  items: TmdbSearchResult[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (items.length === 0) return null;

  function scrollBy(amount: number) {
    scrollRef.current?.scrollBy({ left: amount, behavior: "smooth" });
  }

  return (
    <section className="group/row relative">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>

      <div className="relative">
        <div
          ref={scrollRef}
          // pt-3/pb-3 matter here, not just visual spacing: setting
          // overflow-x without an explicit overflow-y makes the browser
          // compute overflow-y as `auto` too (a CSS spec quirk), which
          // means anything that moves or scales above/below this
          // container's original box — like MediaCard's hover lift —
          // gets clipped without this padding to give it room.
          className="scrollbar-hide flex snap-x snap-mandatory gap-4 overflow-x-auto pt-3 pb-3"
        >
          {items.map((item) => (
            <div
              key={`${item.media_type}-${item.id}`}
              className="poster-reveal-x w-36 shrink-0 snap-start sm:w-44"
            >
              <MediaCard item={item} />
            </div>
          ))}
        </div>

        {/* Edge fades hint that the row continues past the visible
            edge — a small cue that reads more like deliberate design
            than "the grid just stops here". */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent" />

        {/* Scroll arrows: hidden until the row is hovered, and only on
            screens wide enough for a mouse to be the likely input —
            touch devices already have native swipe. */}
        <button
          onClick={() => scrollBy(-SCROLL_AMOUNT)}
          aria-label={`Scroll ${title} left`}
          className="absolute top-1/2 left-2 hidden -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface/95 p-2.5 opacity-0 shadow-lg backdrop-blur-sm transition duration-200 hover:scale-110 hover:border-accent hover:text-accent active:scale-95 group-hover/row:opacity-100 sm:flex"
        >
          <ChevronIcon direction="left" />
        </button>
        <button
          onClick={() => scrollBy(SCROLL_AMOUNT)}
          aria-label={`Scroll ${title} right`}
          className="absolute top-1/2 right-2 hidden -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface/95 p-2.5 opacity-0 shadow-lg backdrop-blur-sm transition duration-200 hover:scale-110 hover:border-accent hover:text-accent active:scale-95 group-hover/row:opacity-100 sm:flex"
        >
          <ChevronIcon direction="right" />
        </button>
      </div>
    </section>
  );
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {direction === "left" ? (
        <path d="M15 18l-6-6 6-6" />
      ) : (
        <path d="M9 18l6-6-6-6" />
      )}
    </svg>
  );
}
