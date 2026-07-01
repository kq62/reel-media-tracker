import { PrismaClient } from "@prisma/client";

// Next.js dev mode hot-reloads modules, which would otherwise create a
// brand new PrismaClient (and a new connection pool) on every file save.
// Stashing the instance on the global object survives those reloads.
// In production, each serverless invocation gets a fresh module scope
// anyway, so this is a no-op there — it's purely a dev-mode safeguard.

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
