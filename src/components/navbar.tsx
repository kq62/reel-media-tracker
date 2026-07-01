"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export function Navbar() {
  const { data: session, status } = useSession();

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="font-display text-xl font-bold tracking-tight"
          >
            Reel
          </Link>
          <nav className="hidden items-center gap-4 text-sm text-muted sm:flex">
            <Link href="/browse" className="hover:text-foreground">
              Browse
            </Link>
            <Link href="/search" className="hover:text-foreground">
              Search
            </Link>
          </nav>
        </div>

        <nav className="flex items-center gap-4 text-sm">
          {status === "loading" && (
            <span className="text-muted">Loading…</span>
          )}

          {status === "unauthenticated" && (
            <>
              <Link href="/login" className="text-muted hover:text-foreground">
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-accent px-3 py-1.5 font-medium text-accent-foreground hover:opacity-90"
              >
                Sign up
              </Link>
            </>
          )}

          {status === "authenticated" && (
            <>
              <Link
                href="/dashboard"
                className="text-muted hover:text-foreground"
              >
                Dashboard
              </Link>
              <span className="hidden text-muted sm:inline">
                Signed in as{" "}
                <span className="text-foreground">{session.user?.name}</span>
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-md border border-border px-3 py-1.5 hover:bg-surface-raised"
              >
                Log out
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
