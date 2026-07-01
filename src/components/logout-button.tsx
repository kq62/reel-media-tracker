"use client";

import { signOut } from "next-auth/react";

// Only the logout button needs to be client-side (it calls signOut).
// The rest of the navbar is a server component that reads the session
// directly — no useSession(), no client-side session fetch, so the
// authenticated links always render correctly on first paint.
export function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="rounded-md border border-border px-3 py-1.5 hover:bg-surface-raised"
    >
      Log out
    </button>
  );
}
