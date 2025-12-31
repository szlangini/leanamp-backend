import { prisma } from '../../db/prisma';
import type { WeightCreateInput } from './schemas';

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

export async function listWeighIns(userId: string, from: string, to: string) {
  await ensureUser(userId);

  return prisma.weighIn.findMany({
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

export async function upsertWeighIn(userId: string, input: WeightCreateInput) {
  await ensureUser(userId);

  return prisma.weighIn.upsert({
    where: {
      userId_dateISO: {
        userId,
        dateISO: toDate(input.dateISO)
      }
    },
    update: {
      weightKg: input.weightKg,
      note: input.note ?? null
    },
    create: {
      userId,
      dateISO: toDate(input.dateISO),
      weightKg: input.weightKg,
      note: input.note ?? null
    }
  });
}

export async function deleteWeighIn(userId: string, dateISO: string) {
  const result = await prisma.weighIn.deleteMany({
    where: {
      userId,
      dateISO: toDate(dateISO)
    }
  });

  return result.count > 0;
}
