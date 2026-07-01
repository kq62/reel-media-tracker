import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { CATALOGS } from "@/lib/catalogs";
import { CatalogRow } from "@/components/catalog-row";

// Reading the session here (Server Component) vs. via useSession() in
// the Navbar (Client Component) are the two ways NextAuth exposes the
// current user — server-side for things like redirects or initial data
// fetching, client-side for anything that needs to react to sign-in/out
// without a full page reload.
export default async function HomePage() {
  const session = await getServerSession(authOptions);

  // Promise.allSettled rather than Promise.all: if one catalog's TMDB
  // call fails, the rest of the home page should still render — losing
  // a single row is a much better failure mode than a blank page.
  const catalogResults = await Promise.allSettled(
    CATALOGS.map(async (catalog) => ({
      title: catalog.title,
      items: await catalog.fetch(),
    }))
  );
  const catalogs = catalogResults
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold">Reel</h1>
        <p className="mt-2 text-muted">
          A personal tracker for what you watch, what you thought of it,
          and what to watch next.
        </p>

        {session ? (
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/search"
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90"
            >
              Search
            </Link>
            <Link
              href="/dashboard"
              className="rounded-md border border-border px-4 py-2 text-sm hover:bg-surface-raised"
            >
              Your Dashboard
            </Link>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90"
            >
              Create an account
            </Link>
            <Link
              href="/login"
              className="rounded-md border border-border px-4 py-2 text-sm hover:bg-surface-raised"
            >
              Log in
            </Link>
          </div>
        )}
      </div>

      {catalogs.length === 0 ? (
        <p className="text-sm text-muted">
          Browsing is unavailable right now — double-check{" "}
          <code className="rounded bg-surface-raised px-1 py-0.5">
            TMDB_API_KEY
          </code>{" "}
          is set, then refresh.
        </p>
      ) : (
        <div className="space-y-8">
          {catalogs.map((catalog) => (
            <CatalogRow
              key={catalog.title}
              title={catalog.title}
              items={catalog.items}
            />
          ))}
        </div>
      )}
    </div>
  );
}
