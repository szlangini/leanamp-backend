import { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma';
import type {
  FoodEntryCreateInput,
  FoodEntryUpdateInput,
  FoodTemplateCreateInput,
  MealGroupCreateInput,
  MealGroupUpdateInput
} from './schemas';

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

export async function mealGroupExists(userId: string, groupId: string) {
  const group = await prisma.mealGroup.findFirst({
    where: { id: groupId, userId }
  });

  return Boolean(group);
}

export async function listFoodTemplates(userId: string) {
  await ensureUser(userId);

  return prisma.foodTemplate.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' }
  });
}

export async function createFoodTemplate(userId: string, input: FoodTemplateCreateInput) {
  await ensureUser(userId);

  return prisma.foodTemplate.create({
    data: {
      userId,
      name: input.name,
      kcal: input.kcal,
      protein: input.protein,
      fat: input.fat,
      carbs: input.carbs,
      fiber: input.fiber
    }
  });
}

export async function deleteFoodTemplate(userId: string, id: string) {
  const existing = await prisma.foodTemplate.findFirst({
    where: { id, userId }
  });

  if (!existing) {
    return false;
  }

  await prisma.foodTemplate.delete({ where: { id } });
  return true;
}

export async function createMealGroup(userId: string, input: MealGroupCreateInput) {
  await ensureUser(userId);

  return prisma.mealGroup.create({
    data: {
      userId,
      dateISO: toDate(input.dateISO),
      title: input.title,
      isExpanded: input.isExpanded ?? true
    }
  });
}

export async function listMealGroups(userId: string, dateISO: string) {
  await ensureUser(userId);

  return prisma.mealGroup.findMany({
    where: { userId, dateISO: toDate(dateISO) },
    orderBy: { createdAt: 'asc' }
  });
}

export async function updateMealGroup(
  userId: string,
  id: string,
  input: MealGroupUpdateInput
) {
  const existing = await prisma.mealGroup.findFirst({
    where: { id, userId }
  });

  if (!existing) {
    return null;
  }

  const data: { title?: string; isExpanded?: boolean } = {};

  if (input.title !== undefined) data.title = input.title;
  if (input.isExpanded !== undefined) data.isExpanded = input.isExpanded;

  return prisma.mealGroup.update({
    where: { id },
    data
  });
}

export async function listFoodEntries(userId: string, dateISO: string) {
  await ensureUser(userId);

  return prisma.foodEntry.findMany({
    where: { userId, dateISO: toDate(dateISO) },
    orderBy: { createdAt: 'asc' }
  });
}

export async function createFoodEntry(userId: string, input: FoodEntryCreateInput) {
  await ensureUser(userId);

  return prisma.foodEntry.create({
    data: {
      userId,
      dateISO: toDate(input.dateISO),
      name: input.name,
      kcal: input.kcal,
      protein: input.protein,
      fat: input.fat,
      carbs: input.carbs,
      fiber: input.fiber,
      multiplier: input.multiplier ?? 1,
      type: input.type,
      groupId: input.groupId ?? null,
      note: input.note ?? null
    }
  });
}

export async function getFoodEntry(userId: string, id: string) {
  return prisma.foodEntry.findFirst({
    where: { id, userId }
  });
}

export async function updateFoodEntry(userId: string, id: string, input: FoodEntryUpdateInput) {
  const existing = await prisma.foodEntry.findFirst({
    where: { id, userId }
  });

  if (!existing) {
    return null;
  }

  const data: Prisma.FoodEntryUncheckedUpdateInput = {};

  if (input.dateISO !== undefined) data.dateISO = toDate(input.dateISO);
  if (input.name !== undefined) data.name = input.name;
  if (input.kcal !== undefined) data.kcal = input.kcal;
  if (input.protein !== undefined) data.protein = input.protein;
  if (input.fat !== undefined) data.fat = input.fat;
  if (input.carbs !== undefined) data.carbs = input.carbs;
  if (input.fiber !== undefined) data.fiber = input.fiber;
  if (input.multiplier !== undefined) data.multiplier = input.multiplier;
  if (input.type !== undefined) data.type = input.type;
  if (input.groupId !== undefined) data.groupId = input.groupId;
  if (input.note !== undefined) data.note = input.note ?? null;

  return prisma.foodEntry.update({
    where: { id },
    data
  });
}

export async function deleteFoodEntry(userId: string, id: string) {
  const existing = await prisma.foodEntry.findFirst({
    where: { id, userId }
  });

  if (!existing) {
    return false;
  }

  await prisma.foodEntry.delete({ where: { id } });
  return true;
}
