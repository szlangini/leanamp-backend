import { PrismaClient } from '@prisma/client';

const logLevels = process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'];

export const prisma = new PrismaClient({ log: logLevels });
