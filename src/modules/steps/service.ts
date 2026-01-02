import { prisma } from '../../db/prisma';
import type { StepsUpsertInput } from './schemas';

function toDate(dateISO: string) {
  return new Date(dateISO);
}

async function ensureUser(userId: string) {
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId }
  });
}

export async function listSteps(userId: string, from: string, to: string) {
  await ensureUser(userId);

  return prisma.stepLog.findMany({
    where: {
      userId,
      dateISO: {
        gte: toDate(from),
        lte: toDate(to)
      }
    },
    orderBy: { dateISO: 'asc' }
  });
}

export async function upsertSteps(userId: string, input: StepsUpsertInput) {
  await ensureUser(userId);

  return prisma.stepLog.upsert({
    where: {
      userId_dateISO: {
        userId,
        dateISO: toDate(input.dateISO)
      }
    },
    update: {
      steps: input.steps
    },
    create: {
      userId,
      dateISO: toDate(input.dateISO),
      steps: input.steps
    }
  });
}
