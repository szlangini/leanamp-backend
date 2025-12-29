import type { FoodEntry, WeighIn } from '@prisma/client';
import { prisma } from '../../db/prisma';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function pad2(value: number) {
  return value.toString().padStart(2, '0');
}

function formatDateLocal(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function parseLocalDate(dateISO: string) {
  const [year, month, day] = dateISO.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function addDaysLocal(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function parseDbDate(dateISO: string) {
  return new Date(dateISO);
}

function dateKeyFromDb(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getTodayISO() {
  return formatDateLocal(new Date());
}

function buildDateRange(rangeDays: number, endDateISO = getTodayISO()) {
  const endDate = parseLocalDate(endDateISO);
  const dates: string[] = [];

  for (let offset = rangeDays - 1; offset >= 0; offset -= 1) {
    const current = addDaysLocal(endDate, -offset);
    dates.push(formatDateLocal(current));
  }

  return {
    dates,
    startISO: dates[0],
    endISO: dates[dates.length - 1]
  };
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function resolveManualTarget(profile: {
  manualCalorieTargetEnabled?: boolean;
  manualCalorieTargetKcal?: number | null;
  kcalTargetOverride?: number | null;
}) {
  const legacyOverride = profile.kcalTargetOverride ?? null;
  const manualKcal = profile.manualCalorieTargetKcal ?? legacyOverride;
  const manualEnabled =
    profile.manualCalorieTargetEnabled ||
    (profile.manualCalorieTargetKcal == null && legacyOverride !== null);

  return {
    manualEnabled,
    manualKcal
  };
}

function getDateDifferenceInDays(startISO: string, endISO: string) {
  const start = new Date(startISO);
  const end = new Date(endISO);
  return (end.getTime() - start.getTime()) / MS_PER_DAY;
}

function compute7dAverage(weighIns: { dateISO: string; weightKg: number }[]) {
  const result: { dateISO: string; weightKg: number }[] = [];

  for (let i = 0; i < weighIns.length; i += 1) {
    const current = weighIns[i];
    const currentDate = new Date(current.dateISO);
    const windowStart = new Date(currentDate);
    windowStart.setUTCDate(windowStart.getUTCDate() - 6);

    const windowWeights = weighIns.filter((entry) => {
      const date = new Date(entry.dateISO);
      return date >= windowStart && date <= currentDate;
    });

    if (windowWeights.length < 2) {
      continue;
    }

    const avg = sum(windowWeights.map((entry) => entry.weightKg)) / windowWeights.length;
    result.push({
      dateISO: current.dateISO,
      weightKg: avg
    });
  }

  return result;
}

async function ensureUser(userId: string) {
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId }
  });
}

function aggregateFoodEntries(entries: FoodEntry[], indexByDate: Map<string, number>) {
  const intakeKcal = Array(indexByDate.size).fill(0);
  const proteinG = Array(indexByDate.size).fill(0);
  const fatG = Array(indexByDate.size).fill(0);
  const carbsG = Array(indexByDate.size).fill(0);
  const fiberG = Array(indexByDate.size).fill(0);

  for (const entry of entries) {
    const dateKey = dateKeyFromDb(entry.dateISO);
    const index = indexByDate.get(dateKey);
    if (index === undefined) {
      continue;
    }

    const multiplier = entry.multiplier ?? 1;
    intakeKcal[index] += entry.kcal * multiplier;
    proteinG[index] += entry.protein * multiplier;
    fatG[index] += entry.fat * multiplier;
    carbsG[index] += entry.carbs * multiplier;
    fiberG[index] += entry.fiber * multiplier;
  }

  return {
    intakeKcal,
    proteinG,
    fatG,
    carbsG,
    fiberG
  };
}

function aggregateWaterLogs(
  logs: { dateISO: Date; amountMl: number }[],
  indexByDate: Map<string, number>
) {
  const waterMl = Array(indexByDate.size).fill(0);

  for (const log of logs) {
    const dateKey = dateKeyFromDb(log.dateISO);
    const index = indexByDate.get(dateKey);
    if (index === undefined) {
      continue;
    }

    waterMl[index] += log.amountMl;
  }

  return waterMl;
}

function aggregateExtraActivity(
  rows: { dateISO: Date; kcalEst: number }[],
  indexByDate: Map<string, number>
) {
  const extraActivityKcal = Array(indexByDate.size).fill(0);

  for (const row of rows) {
    const dateKey = dateKeyFromDb(row.dateISO);
    const index = indexByDate.get(dateKey);
    if (index === undefined) {
      continue;
    }

    extraActivityKcal[index] += row.kcalEst;
  }

  return extraActivityKcal;
}

function aggregateCompletions(
  rows: { dateISO: Date }[],
  indexByDate: Map<string, number>
) {
  const counts = Array(indexByDate.size).fill(0);

  for (const row of rows) {
    const dateKey = dateKeyFromDb(row.dateISO);
    const index = indexByDate.get(dateKey);
    if (index === undefined) {
      continue;
    }

    counts[index] += 1;
  }

  const any = counts.map((count) => count > 0);

  return { counts, any };
}

function normalizeWeighIns(weighIns: WeighIn[]) {
  const sorted = [...weighIns].sort((a, b) => a.dateISO.getTime() - b.dateISO.getTime());

  return sorted.map((entry) => ({
    dateISO: dateKeyFromDb(entry.dateISO),
    weightKg: entry.weightKg
  }));
}

export async function getSummary(userId: string, rangeDays: number) {
  await ensureUser(userId);

  const profile = await prisma.profile.findUnique({
    where: { userId }
  });

  const baselineTDEE = profile?.baselineTDEE ?? 0;
  const neatFactor = profile?.neatFactor ?? 0.8;
  const goalMode = profile?.goalMode ?? 'maintain';
  const targetRateKgPerWeek = profile?.targetRateKgPerWeek ?? 0;
  const autoAdjustKcal = profile?.autoAdjustKcal ?? 0;
  const manualTarget = resolveManualTarget({
    manualCalorieTargetEnabled: profile?.manualCalorieTargetEnabled,
    manualCalorieTargetKcal: profile?.manualCalorieTargetKcal,
    kcalTargetOverride: profile?.kcalTargetOverride
  });

  const { dates, startISO, endISO } = buildDateRange(rangeDays);
  const indexByDate = new Map(dates.map((date, index) => [date, index]));

  const [foodEntries, waterLogs, extraActivity, completions, weighIns] = await Promise.all([
    prisma.foodEntry.findMany({
      where: {
        userId,
        dateISO: {
          gte: parseDbDate(startISO),
          lte: parseDbDate(endISO)
        }
      }
    }),
    prisma.waterLog.findMany({
      where: {
        userId,
        dateISO: {
          gte: parseDbDate(startISO),
          lte: parseDbDate(endISO)
        }
      }
    }),
    prisma.extraActivity.findMany({
      where: {
        userId,
        dateISO: {
          gte: parseDbDate(startISO),
          lte: parseDbDate(endISO)
        }
      }
    }),
    prisma.completionLog.findMany({
      where: {
        userId,
        dateISO: {
          gte: parseDbDate(startISO),
          lte: parseDbDate(endISO)
        }
      }
    }),
    prisma.weighIn.findMany({
      where: {
        userId,
        dateISO: {
          gte: parseDbDate(startISO),
          lte: parseDbDate(endISO)
        }
      }
    })
  ]);

  const foodAgg = aggregateFoodEntries(foodEntries, indexByDate);
  const waterMl = aggregateWaterLogs(waterLogs, indexByDate);
  const extraActivityKcal = aggregateExtraActivity(extraActivity, indexByDate);
  const completionAgg = aggregateCompletions(completions, indexByDate);

  const stepsDeltaKcal = Array(rangeDays).fill(0);
  const autoAdjustKcalSeries = Array(rangeDays).fill(autoAdjustKcal);
  const outtakeEstKcal: number[] = [];
  const targetKcal: number[] = [];
  const balanceKcal: number[] = [];
  const modeOffsetKcal: number[] = [];

  const modeOffsetBase =
    goalMode === 'maintain'
      ? 0
      : (targetRateKgPerWeek * 7700) / 7 * (goalMode === 'cut' ? -1 : 1);

  for (let i = 0; i < rangeDays; i += 1) {
    const extraKcal = extraActivityKcal[i] || 0;
    const outtake = baselineTDEE + extraKcal * neatFactor + stepsDeltaKcal[i];
    const modeOffset = modeOffsetBase;
    const target = manualTarget.manualEnabled && manualTarget.manualKcal != null
      ? manualTarget.manualKcal
      : outtake + modeOffset + autoAdjustKcal;

    outtakeEstKcal.push(outtake);
    modeOffsetKcal.push(modeOffset);
    targetKcal.push(target);
    balanceKcal.push(outtake - foodAgg.intakeKcal[i]);
  }

  const weighInsNormalized = normalizeWeighIns(weighIns);
  const avg7d = compute7dAverage(weighInsNormalized);

  let actualRateKgPerWeek: number | null = null;
  if (weighInsNormalized.length >= 2) {
    const first = weighInsNormalized[0];
    const last = weighInsNormalized[weighInsNormalized.length - 1];
    const daysDiff = getDateDifferenceInDays(first.dateISO, last.dateISO);
    if (daysDiff > 0) {
      actualRateKgPerWeek = ((last.weightKg - first.weightKg) / daysDiff) * 7;
    }
  }

  return {
    rangeDays,
    dates,
    daily: {
      intakeKcal: foodAgg.intakeKcal,
      outtakeEstKcal,
      targetKcal,
      balanceKcal,
      modeOffsetKcal,
      autoAdjustKcal: autoAdjustKcalSeries,
      extraActivityKcal,
      stepsDeltaKcal,
      waterMl,
      macros: {
        proteinG: foodAgg.proteinG,
        fatG: foodAgg.fatG,
        carbsG: foodAgg.carbsG,
        fiberG: foodAgg.fiberG
      },
      completions: {
        any: completionAgg.any,
        count: completionAgg.counts
      }
    },
    weight: {
      weighIns: weighInsNormalized,
      avg7d
    },
    aggregates: {
      avgIntakeKcal: sum(foodAgg.intakeKcal) / rangeDays,
      avgOuttakeEstKcal: sum(outtakeEstKcal) / rangeDays,
      avgTargetKcal: sum(targetKcal) / rangeDays,
      avgBalanceKcal: sum(balanceKcal) / rangeDays,
      actualRateKgPerWeek
    },
    meta: {
      neatFactor,
      baselineTDEE: profile?.baselineTDEE ?? null,
      goalMode,
      targetRateKgPerWeek: profile?.targetRateKgPerWeek ?? null,
      autoAdjustKcalCurrent: autoAdjustKcal
    }
  };
}

export async function getStrengthTrends(userId: string, rangeDays: number) {
  await ensureUser(userId);

  const { startISO, endISO } = buildDateRange(rangeDays);

  const entries = await prisma.topSetEntry.findMany({
    where: {
      userId,
      dateISO: {
        gte: parseDbDate(startISO),
        lte: parseDbDate(endISO)
      }
    },
    orderBy: [{ dateISO: 'asc' }, { createdAt: 'asc' }],
    include: {
      exercise: {
        select: {
          name: true
        }
      }
    }
  });

  const grouped = new Map<
    string,
    { exerciseName: string; first: typeof entries[number]; last: typeof entries[number] }
  >();

  for (const entry of entries) {
    const existing = grouped.get(entry.exerciseId);
    if (!existing) {
      grouped.set(entry.exerciseId, {
        exerciseName: entry.exercise.name,
        first: entry,
        last: entry
      });
    } else {
      existing.last = entry;
    }
  }

  const topDeltas = Array.from(grouped.entries()).map(([exerciseId, data]) => {
    return {
      exerciseId,
      exerciseName: data.exerciseName,
      first: {
        dateISO: dateKeyFromDb(data.first.dateISO),
        weight: data.first.weight,
        reps: data.first.reps
      },
      last: {
        dateISO: dateKeyFromDb(data.last.dateISO),
        weight: data.last.weight,
        reps: data.last.reps
      },
      deltaWeight: data.last.weight - data.first.weight,
      deltaReps: data.last.reps - data.first.reps
    };
  });

  topDeltas.sort((a, b) => {
    if (b.deltaWeight !== a.deltaWeight) {
      return b.deltaWeight - a.deltaWeight;
    }
    return b.deltaReps - a.deltaReps;
  });

  return {
    rangeDays,
    topDeltas: topDeltas.slice(0, 10)
  };
}
