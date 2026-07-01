"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { SUPPORTED_REGIONS, type RegionCode } from "@/lib/regions";

/**
 * A plain <select> that posts the chosen region to /api/region (which
 * sets a cookie) and then refreshes the current page so the server
 * component re-reads that cookie and re-fetches watch providers for the
 * new region. Kept as a small, self-contained client component so the
 * detail page around it can stay a server component.
 */
export function RegionSelector({ currentRegion }: { currentRegion: RegionCode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const region = event.target.value;
    await fetch("/api/region", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ region }),
    });
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <label className="flex items-center gap-2 text-sm text-muted">
      Region:
      <select
        defaultValue={currentRegion}
        onChange={handleChange}
        disabled={isPending}
        className="rounded-md border border-border bg-surface-raised px-2 py-1 text-foreground focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-60"
      >
        {SUPPORTED_REGIONS.map((region) => (
          <option key={region.code} value={region.code}>
            {region.label}
          </option>
        ))}
      </select>
    </label>
  );
}
