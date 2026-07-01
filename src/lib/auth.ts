import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// Credentials provider = email/password auth. NextAuth requires JWT
// (not database) sessions when a Credentials provider is in play, since
// there's no OAuth handshake for an adapter to persist — the `authorize`
// callback below is the entire login flow. The JWT is a signed,
// stateless cookie, so there's no Session table to manage.
export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user) {
          return null;
        }

        const passwordMatches = await bcrypt.compare(
          credentials.password,
          user.password
        );
        if (!passwordMatches) {
          return null;
        }

        // Whatever is returned here ends up on the JWT (see the `jwt`
        // callback below), so keep it small and exclude the password hash.
        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
  callbacks: {
    // Copy the user id onto the token right after sign-in, so it's
    // available to read back out in the session callback below.
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    // Expose the id on `session.user` so client components / API routes
    // can identify the current user without a separate DB lookup.
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};
