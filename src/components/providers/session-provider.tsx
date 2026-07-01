"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

// useSession() (used in the Navbar and elsewhere) only works inside a
// SessionProvider, and that provider relies on React context — which
// means it has to be a Client Component. Isolating it here keeps
// layout.tsx itself a Server Component.
export function AuthSessionProvider({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
