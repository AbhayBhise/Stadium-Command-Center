import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';
import { logger } from '../config/logger';

// Singleton: reuse the same client across hot-reloads in development
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const hasDatabase = Boolean(env.DATABASE_URL);

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      env.NODE_ENV === 'development'
        ? [
            { level: 'query', emit: 'event' },
            { level: 'warn', emit: 'stdout' },
            { level: 'error', emit: 'stdout' },
          ]
        : [{ level: 'error', emit: 'stdout' }],
  });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export const connectDatabase = async (): Promise<void> => {
  if (!hasDatabase) {
    logger.warn('⚠️  No DATABASE_URL — running without database. Knowledge retrieval and persistence disabled.');
    return;
  }
  await prisma.$connect();
  logger.info('✅ Database connected');
};

export const disconnectDatabase = async (): Promise<void> => {
  if (!hasDatabase) return;
  await prisma.$disconnect();
  logger.info('Database disconnected');
};
