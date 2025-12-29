import { prisma } from '../../db/prisma';
import type { WaterUpsertInput } from './schemas';

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

export async function getWaterLog(userId: string, dateISO: string) {
  await ensureUser(userId);

  return prisma.waterLog.findUnique({
    where: {
      userId_dateISO: {
        userId,
        dateISO: toDate(dateISO)
      }
    }
  });
}

export async function upsertWaterLog(userId: string, input: WaterUpsertInput) {
  await ensureUser(userId);

  return prisma.waterLog.upsert({
    where: {
      userId_dateISO: {
        userId,
        dateISO: toDate(input.dateISO)
      }
    },
    update: {
      amountMl: input.amountMl
    },
    create: {
      userId,
      dateISO: toDate(input.dateISO),
      amountMl: input.amountMl
    }
  });
}
