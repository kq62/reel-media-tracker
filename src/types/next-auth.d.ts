import type { DefaultSession } from "next-auth";

// NextAuth's default Session/JWT types don't include `id`. We attach the
// user's database id to both in src/lib/auth.ts, so this module
// augmentation makes TypeScript aware of that — without it, every
// `session.user.id` access in the app would need an `as` cast.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
  }
}
