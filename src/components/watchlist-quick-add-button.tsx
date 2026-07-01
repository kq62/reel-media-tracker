"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { MediaType } from "@/lib/tmdb";

/**
 * Deliberately one-directional: this button only adds. Removing or
 * marking watched both require knowing the item's current state, which
 * would mean a watchlist-status lookup for every card in a grid — not
 * worth it for a quick-add affordance. Full control (mark watched,
 * remove) lives on the detail page where that lookup is already a
 * single query, not N of them.
 */
export function WatchlistQuickAddButton({
  tmdbId,
  mediaType,
}: {
  tmdbId: number;
  mediaType: MediaType;
}) {
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const [added, setAdded] = useState(false);

  async function handleClick(event: React.MouseEvent) {
    event.preventDefault(); // don't follow the card's link to the detail page
    event.stopPropagation();

    if (sessionStatus !== "authenticated") {
      router.push("/login");
      return;
    }

    setAdded(true); // optimistic
    const response = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tmdbId, mediaType }),
    });
    if (!response.ok) {
      setAdded(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      aria-label={added ? "Added to watchlist" : "Add to watchlist"}
      title={added ? "Added to watchlist" : "Add to watchlist"}
      className={`absolute top-2 right-2 flex size-7 items-center justify-center rounded-full text-sm font-bold shadow transition ${
        added
          ? "bg-watched text-background"
          : "bg-background/80 text-foreground hover:bg-accent hover:text-accent-foreground"
      }`}
    >
      {added ? "✓" : "+"}
    </button>
  );
}
