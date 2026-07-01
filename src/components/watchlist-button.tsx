"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MediaType } from "@/lib/tmdb";

type Status = "none" | "planned" | "watched";

export function WatchlistButton({
  tmdbId,
  mediaType,
  initialStatus,
  isAuthenticated,
}: {
  tmdbId: number;
  mediaType: MediaType;
  initialStatus: Status;
  isAuthenticated: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(initialStatus);
  const [isPending, startTransition] = useTransition();

  function goToLogin() {
    router.push("/login");
  }

  async function addToWatchlist() {
    if (!isAuthenticated) return goToLogin();
    const response = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tmdbId, mediaType }),
    });
    if (response.ok) {
      setStatus("planned");
      startTransition(() => router.refresh());
    }
  }

  async function markWatched() {
    const response = await fetch("/api/watchlist", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tmdbId, mediaType, status: "watched" }),
    });
    if (response.ok) {
      setStatus("watched");
      startTransition(() => router.refresh());
    }
  }

  async function remove() {
    const response = await fetch(
      `/api/watchlist?tmdbId=${tmdbId}&mediaType=${mediaType}`,
      { method: "DELETE" }
    );
    if (response.ok) {
      setStatus("none");
      startTransition(() => router.refresh());
    }
  }

  if (status === "none") {
    return (
      <button
        onClick={addToWatchlist}
        disabled={isPending}
        className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-60"
      >
        + Add to Watchlist
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="rounded-md border border-border bg-surface-raised px-3 py-2 text-sm">
        {status === "planned" ? "Planned" : "✓ Watched"}
      </span>
      {status === "planned" && (
        <button
          onClick={markWatched}
          disabled={isPending}
          className="rounded-md border border-watched px-3 py-2 text-sm text-watched hover:bg-watched/10 disabled:opacity-60"
        >
          Mark as Watched
        </button>
      )}
      <button
        onClick={remove}
        disabled={isPending}
        className="rounded-md border border-border px-3 py-2 text-sm text-muted hover:bg-surface-raised disabled:opacity-60"
      >
        Remove
      </button>
    </div>
  );
}
