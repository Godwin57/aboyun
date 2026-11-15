import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    // Neon computes scale to zero; the first query after idle can take several
    // seconds while the compute wakes up, so allow for it.
    connectionTimeoutMillis: 15_000,
    // Drop idle connections quickly. Neon (and home routers) close idle sockets, and a
    // pooled connection that was closed behind our back is what causes "Failed to get
    // session" or "can't reach database" on the next request.
    idleTimeoutMillis: 10_000,
    keepAlive: true,
    max: 5,
  });
  return new PrismaClient({ adapter });
}

/** Prisma client singleton (survives hot reloads in dev). */
export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
