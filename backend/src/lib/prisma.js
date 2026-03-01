import { PrismaClient } from '@prisma/client';

/**
 * Prisma client singleton.
 * Prevents multiple instances during development hot-reloads.
 * In production, a single instance is created and reused.
 *
 * Prisma v6: DATABASE_URL is read from schema.prisma via env("DATABASE_URL").
 */

const globalForPrisma = globalThis;

const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        log:
            process.env.NODE_ENV === 'development'
                ? ['query', 'error', 'warn']
                : ['error'],
    });

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

export default prisma;
