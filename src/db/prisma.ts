import { Prisma, PrismaClient } from '@prisma/client';

const logLevels =
  process.env.NODE_ENV === 'development'
    ? (['warn', 'error'] as Prisma.LogLevel[])
    : (['error'] as Prisma.LogLevel[]);

export const prisma = new PrismaClient({ log: logLevels });
