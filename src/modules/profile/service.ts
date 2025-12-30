import { Prisma, Profile } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { ProfileUpdateInput, WeeklyAdjustEntry } from './schemas';

const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';

const DEFAULT_PROFILE = {
  units: 'metric',
  sex: 'unknown',
  activityLevel: 'sedentary',
  dietPreference: 'balanced',
  goalMode: 'maintain',
  targetRateKgPerWeek: 0,
  autoAdjustKcal: 0,
  weeklyAdjustLog: [] as Prisma.JsonArray,
  neatFactor: 0.8,
  baselineSteps: 7000,
  manualCalorieTargetEnabled: false
} as const;

export function getDefaultUserId() {
  return DEFAULT_USER_ID;
}

async function ensureUser(userId: string) {
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId }
  });
}

function normalizeWeeklyAdjustLog(value: Prisma.JsonValue | null): WeeklyAdjustEntry[] {
  return Array.isArray(value) ? (value as WeeklyAdjustEntry[]) : [];
}

function normalizeProfile(profile: Profile) {
  const legacyOverride = profile.kcalTargetOverride ?? null;
  const manualCalorieTargetKcal = profile.manualCalorieTargetKcal ?? legacyOverride;
  const manualCalorieTargetEnabled =
    profile.manualCalorieTargetEnabled ||
    (profile.manualCalorieTargetKcal == null && legacyOverride !== null);

  return {
    ...profile,
    targetRateKgPerWeek: profile.targetRateKgPerWeek ?? 0,
    autoAdjustKcal: profile.autoAdjustKcal ?? 0,
    weeklyAdjustLog: normalizeWeeklyAdjustLog(profile.weeklyAdjustLog),
    neatFactor: profile.neatFactor ?? 0.8,
    baselineSteps: profile.baselineSteps ?? 7000,
    manualCalorieTargetEnabled,
    manualCalorieTargetKcal
  };
}

function buildCreateData(userId: string, input: ProfileUpdateInput): Prisma.ProfileCreateInput {
  const manualKcal = input.manualCalorieTargetKcal ?? null;
  const manualEnabled =
    input.manualCalorieTargetEnabled ??
    (manualKcal !== null ? true : DEFAULT_PROFILE.manualCalorieTargetEnabled);
  const manualValue = manualEnabled ? manualKcal : null;
  const legacyOverride = input.kcalTargetOverride ?? (manualEnabled ? manualValue : null);

  return {
    user: { connect: { id: userId } },
    units: input.units ?? DEFAULT_PROFILE.units,
    sex: input.sex ?? DEFAULT_PROFILE.sex,
    activityLevel: input.activityLevel ?? DEFAULT_PROFILE.activityLevel,
    dietPreference: input.dietPreference ?? DEFAULT_PROFILE.dietPreference,
    goalMode: input.goalMode ?? DEFAULT_PROFILE.goalMode,
    targetRateKgPerWeek: input.targetRateKgPerWeek ?? DEFAULT_PROFILE.targetRateKgPerWeek,
    autoAdjustKcal: input.autoAdjustKcal ?? DEFAULT_PROFILE.autoAdjustKcal,
    weeklyAdjustLog: (input.weeklyAdjustLog ?? DEFAULT_PROFILE.weeklyAdjustLog) as Prisma.JsonArray,
    lastAdjustedWeekKey: input.lastAdjustedWeekKey ?? null,
    neatFactor: input.neatFactor ?? DEFAULT_PROFILE.neatFactor,
    baselineSteps: input.baselineSteps ?? DEFAULT_PROFILE.baselineSteps,
    manualCalorieTargetEnabled: manualEnabled,
    manualCalorieTargetKcal: manualValue,
    kcalTargetOverride: legacyOverride,
    weightKg: input.weightKg ?? null,
    heightCm: input.heightCm ?? null,
    age: input.age ?? null,
    bodyFatPct: input.bodyFatPct ?? null,
    baselineTDEE: input.baselineTDEE ?? null,
    baselineTDEEAuto: input.baselineTDEEAuto ?? null,
    targetWeightKg: input.targetWeightKg ?? null,
    weeklyTrainingGoal: input.weeklyTrainingGoal ?? null,
    proteinGoalG: input.proteinGoalG ?? null,
    fatGoalG: input.fatGoalG ?? null,
    fiberGoalG: input.fiberGoalG ?? null,
    waterGoalLiters: input.waterGoalLiters ?? null,
    waterGoalAuto: input.waterGoalAuto ?? null,
    kcalTargetAuto: input.kcalTargetAuto ?? null,
    timezone: input.timezone ?? null,
    hasOnboarded: input.hasOnboarded ?? false
  };
}

function buildUpdateData(input: ProfileUpdateInput): Prisma.ProfileUpdateInput {
  const data: Prisma.ProfileUpdateInput = {};

  if (input.units !== undefined) data.units = input.units;
  if (input.weightKg !== undefined) data.weightKg = input.weightKg;
  if (input.heightCm !== undefined) data.heightCm = input.heightCm;
  if (input.age !== undefined) data.age = input.age;
  if (input.sex !== undefined) data.sex = input.sex;
  if (input.bodyFatPct !== undefined) data.bodyFatPct = input.bodyFatPct;
  if (input.activityLevel !== undefined) data.activityLevel = input.activityLevel;
  if (input.baselineTDEE !== undefined) data.baselineTDEE = input.baselineTDEE;
  if (input.baselineTDEEAuto !== undefined) data.baselineTDEEAuto = input.baselineTDEEAuto;
  if (input.targetWeightKg !== undefined) data.targetWeightKg = input.targetWeightKg;
  if (input.weeklyTrainingGoal !== undefined) data.weeklyTrainingGoal = input.weeklyTrainingGoal;
  if (input.proteinGoalG !== undefined) data.proteinGoalG = input.proteinGoalG;
  if (input.fatGoalG !== undefined) data.fatGoalG = input.fatGoalG;
  if (input.fiberGoalG !== undefined) data.fiberGoalG = input.fiberGoalG;
  if (input.waterGoalLiters !== undefined) data.waterGoalLiters = input.waterGoalLiters;
  if (input.waterGoalAuto !== undefined) data.waterGoalAuto = input.waterGoalAuto;
  if (input.kcalTargetAuto !== undefined) data.kcalTargetAuto = input.kcalTargetAuto;
  if (input.kcalTargetOverride !== undefined) data.kcalTargetOverride = input.kcalTargetOverride;
  if (input.dietPreference !== undefined) data.dietPreference = input.dietPreference;
  if (input.timezone !== undefined) data.timezone = input.timezone;
  if (input.hasOnboarded !== undefined) data.hasOnboarded = input.hasOnboarded;
  if (input.goalMode !== undefined) data.goalMode = input.goalMode;
  if (input.targetRateKgPerWeek !== undefined) data.targetRateKgPerWeek = input.targetRateKgPerWeek;
  if (input.autoAdjustKcal !== undefined) data.autoAdjustKcal = input.autoAdjustKcal;
  if (input.weeklyAdjustLog !== undefined)
    data.weeklyAdjustLog = input.weeklyAdjustLog as Prisma.InputJsonValue;
  if (input.lastAdjustedWeekKey !== undefined) data.lastAdjustedWeekKey = input.lastAdjustedWeekKey;
  if (input.neatFactor !== undefined) data.neatFactor = input.neatFactor;
  if (input.baselineSteps !== undefined) data.baselineSteps = input.baselineSteps;

  if (input.manualCalorieTargetEnabled !== undefined) {
    data.manualCalorieTargetEnabled = input.manualCalorieTargetEnabled;
    if (!input.manualCalorieTargetEnabled) {
      data.manualCalorieTargetKcal = null;
      data.kcalTargetOverride = null;
    }
  }

  if (input.manualCalorieTargetKcal !== undefined) {
    data.manualCalorieTargetKcal = input.manualCalorieTargetKcal;
    if (input.manualCalorieTargetEnabled !== false) {
      data.kcalTargetOverride = input.manualCalorieTargetKcal;
    }
  }

  return data;
}

export async function getProfile(userId = DEFAULT_USER_ID) {
  await ensureUser(userId);

  let profile = await prisma.profile.findUnique({ where: { userId } });

  if (!profile) {
    profile = await prisma.profile.create({
      data: buildCreateData(userId, {})
    });
  }

  return normalizeProfile(profile);
}

export async function upsertProfile(userId = DEFAULT_USER_ID, input: ProfileUpdateInput) {
  await ensureUser(userId);

  const existing = await prisma.profile.findUnique({ where: { userId } });

  if (!existing) {
    const created = await prisma.profile.create({
      data: buildCreateData(userId, input)
    });
    return normalizeProfile(created);
  }

  const updated = await prisma.profile.update({
    where: { userId },
    data: buildUpdateData(input)
  });

  return normalizeProfile(updated);
}
