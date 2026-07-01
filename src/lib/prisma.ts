import { PrismaClient } from "@prisma/client";

// Next.js dev mode hot-reloads modules, which would otherwise create a
// brand new PrismaClient (and a new connection pool) on every file save.
// Stashing the instance on the global object survives those reloads.
// In production (Vercel serverless), each function invocation gets a
// fresh module scope, so the global stash is a no-op there — it's
// purely a dev-mode safeguard.
//
// Connection management for Supabase: the DATABASE_URL should include
// ?pgbouncer=true&connection_limit=1 so Prisma works correctly with
// Supabase's PgBouncer pooler and doesn't exhaust the 15-connection
// free-tier limit across concurrent Vercel function invocations.

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
