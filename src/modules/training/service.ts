import { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma';
import type {
  CompletionCreateInput,
  DayPlanCreateInput,
  DayPlanUpdateInput,
  ExerciseCreateInput,
  ExerciseUpdateInput,
  ExtraActivityCreateInput,
  TopSetCreateInput
} from './schemas';

function toDate(dateISO: string) {
  return new Date(dateISO);
}

function startOfTodayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

async function ensureUser(userId: string) {
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId }
  });
}

export async function listPlan(userId: string) {
  await ensureUser(userId);

  return prisma.dayPlan.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    include: {
      exercises: {
        orderBy: [{ pinned: 'desc' }, { createdAt: 'asc' }]
      }
    }
  });
}

export async function createDayPlan(userId: string, input: DayPlanCreateInput) {
  await ensureUser(userId);

  return prisma.dayPlan.create({
    data: {
      userId,
      title: input.title,
      emoji: input.emoji
    }
  });
}

export async function updateDayPlan(userId: string, id: string, input: DayPlanUpdateInput) {
  const existing = await prisma.dayPlan.findFirst({
    where: { id, userId }
  });

  if (!existing) {
    return null;
  }

  const data: { title?: string; emoji?: string } = {};

  if (input.title !== undefined) data.title = input.title;
  if (input.emoji !== undefined) data.emoji = input.emoji;

  return prisma.dayPlan.update({
    where: { id },
    data
  });
}

export async function deleteDayPlan(userId: string, id: string) {
  const existing = await prisma.dayPlan.findFirst({
    where: { id, userId }
  });

  if (!existing) {
    return false;
  }

  await prisma.dayPlan.delete({ where: { id } });
  return true;
}

export async function createExercise(userId: string, input: ExerciseCreateInput) {
  await ensureUser(userId);

  const day = await prisma.dayPlan.findFirst({
    where: { id: input.dayId, userId }
  });

  if (!day) {
    return null;
  }

  return prisma.plannedExercise.create({
    data: {
      userId,
      dayId: input.dayId,
      name: input.name,
      workingWeight: input.workingWeight,
      targetRepsMin: input.targetRepsMin,
      targetRepsMax: input.targetRepsMax,
      notes: input.notes ?? null,
      pinned: input.pinned ?? false
    }
  });
}

export async function updateExercise(userId: string, id: string, input: ExerciseUpdateInput) {
  const existing = await prisma.plannedExercise.findFirst({
    where: { id, userId }
  });

  if (!existing) {
    return null;
  }

  const data: {
    name?: string;
    workingWeight?: number;
    targetRepsMin?: number;
    targetRepsMax?: number;
    notes?: string | null;
    pinned?: boolean;
  } = {};

  if (input.name !== undefined) data.name = input.name;
  if (input.workingWeight !== undefined) data.workingWeight = input.workingWeight;
  if (input.targetRepsMin !== undefined) data.targetRepsMin = input.targetRepsMin;
  if (input.targetRepsMax !== undefined) data.targetRepsMax = input.targetRepsMax;
  if (input.notes !== undefined) data.notes = input.notes;
  if (input.pinned !== undefined) data.pinned = input.pinned;

  return prisma.plannedExercise.update({
    where: { id },
    data
  });
}

export async function deleteExercise(userId: string, id: string) {
  const existing = await prisma.plannedExercise.findFirst({
    where: { id, userId }
  });

  if (!existing) {
    return false;
  }

  await prisma.plannedExercise.delete({ where: { id } });
  return true;
}

async function resolveDayAndExercise(userId: string, dayId: string, exerciseId: string) {
  const day = await prisma.dayPlan.findFirst({
    where: { id: dayId, userId }
  });

  if (!day) {
    return null;
  }

  const exercise = await prisma.plannedExercise.findFirst({
    where: { id: exerciseId, userId }
  });

  if (!exercise || exercise.dayId !== dayId) {
    return null;
  }

  return { day, exercise };
}

export async function upsertTopSet(userId: string, input: TopSetCreateInput) {
  await ensureUser(userId);

  const resolved = await resolveDayAndExercise(userId, input.dayId, input.exerciseId);

  if (!resolved) {
    return null;
  }

  const date = toDate(input.dateISO);

  const existing = await prisma.topSetEntry.findFirst({
    where: {
      userId,
      dateISO: date,
      exerciseId: input.exerciseId
    }
  });

  const data = {
    dayId: input.dayId,
    exerciseId: input.exerciseId,
    dateISO: date,
    weight: input.weight,
    reps: input.reps,
    sets: input.sets,
    workSets: input.workSets as Prisma.JsonArray
  };

  if (existing) {
    return prisma.topSetEntry.update({
      where: { id: existing.id },
      data
    });
  }

  return prisma.topSetEntry.create({
    data: {
      userId,
      ...data
    }
  });
}

export async function listTopSets(userId: string, from: Date, to: Date) {
  await ensureUser(userId);

  return prisma.topSetEntry.findMany({
    where: {
      userId,
      dateISO: {
        gte: from,
        lte: to
      }
    },
    orderBy: { dateISO: 'asc' }
  });
}

export function resolveRange(range: '7' | '30' | '90') {
  const days = Number(range);
  const today = startOfTodayUtc();
  const from = new Date(today);
  from.setUTCDate(today.getUTCDate() - (days - 1));
  return { from, to: today };
}

export async function upsertCompletion(userId: string, input: CompletionCreateInput) {
  await ensureUser(userId);

  const day = await prisma.dayPlan.findFirst({
    where: { id: input.dayId, userId }
  });

  if (!day) {
    return null;
  }

  return prisma.completionLog.upsert({
    where: {
      userId_dateISO_dayId: {
        userId,
        dateISO: toDate(input.dateISO),
        dayId: input.dayId
      }
    },
    update: {},
    create: {
      userId,
      dateISO: toDate(input.dateISO),
      dayId: input.dayId
    }
  });
}

export async function deleteCompletion(userId: string, dateISO: string, dayId: string) {
  const result = await prisma.completionLog.deleteMany({
    where: {
      userId,
      dateISO: toDate(dateISO),
      dayId
    }
  });

  return result.count > 0;
}

export async function createExtraActivity(userId: string, input: ExtraActivityCreateInput) {
  await ensureUser(userId);

  return prisma.extraActivity.create({
    data: {
      userId,
      dateISO: toDate(input.dateISO),
      type: input.type,
      minutes: input.minutes,
      intensity: input.intensity,
      kcalEst: input.kcalEst,
      notes: input.notes ?? null
    }
  });
}

export async function listExtraActivity(userId: string, dateISO: string) {
  await ensureUser(userId);

  return prisma.extraActivity.findMany({
    where: {
      userId,
      dateISO: toDate(dateISO)
    },
    orderBy: { createdAt: 'asc' }
  });
}

export async function deleteExtraActivity(userId: string, id: string) {
  const existing = await prisma.extraActivity.findFirst({
    where: { id, userId }
  });

  if (!existing) {
    return false;
  }

  await prisma.extraActivity.delete({ where: { id } });
  return true;
}
