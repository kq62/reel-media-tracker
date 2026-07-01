"use client";

import { useEffect } from "react";
import Link from "next/link";

// Next.js requires error.tsx to be a Client Component — it uses React's
// ErrorBoundary under the hood, which is a class-component feature that
// only works client-side. The `reset` function re-renders the segment,
// which is usually enough to recover from a transient error.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console in dev — in production you'd send this to an error
    // tracking service like Sentry here.
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-4xl">⚠️</p>
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="max-w-sm text-sm text-muted">
        An unexpected error occurred. This has been logged — in the meantime,
        try refreshing or going back.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-md border border-border px-4 py-2 text-sm hover:bg-surface-raised"
        >
          Go home
        </Link>
      </div>
      {process.env.NODE_ENV === "development" && error.message && (
        <p className="mt-2 max-w-sm rounded-md bg-surface p-3 text-left font-mono text-xs text-danger">
          {error.message}
        </p>
      )}
    </div>
  );
}
