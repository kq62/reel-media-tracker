"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

// Kept for client components elsewhere that use useSession(). The navbar
// no longer depends on this — it reads the session server-side directly.
export function AuthSessionProvider({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
