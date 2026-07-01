import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";

// Server Component: reads the session directly on the server instead of
// via useSession() on the client. Since the dashboard (also server-read)
// works, this guarantees the authenticated navbar links render correctly
// — no dependency on a client-side /api/auth/session fetch that can be
// slow or fail on Vercel.
export async function Navbar() {
  const session = await getServerSession(authOptions);
  const isAuthenticated = Boolean(session?.user);

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
            {isAuthenticated && (
              <Link href="/recommendations" className="hover:text-foreground">
                For You
              </Link>
            )}
          </nav>
        </div>

        <nav className="flex items-center gap-4 text-sm">
          {isAuthenticated ? (
            <>
              <Link
                href="/dashboard"
                className="text-muted hover:text-foreground"
              >
                Dashboard
              </Link>
              <span className="hidden text-muted sm:inline">
                Signed in as{" "}
                <span className="text-foreground">{session!.user?.name}</span>
              </span>
              <LogoutButton />
            </>
          ) : (
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
        </nav>
      </div>
    </header>
  );
}
