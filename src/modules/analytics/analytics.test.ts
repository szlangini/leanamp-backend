import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Prisma } from '@prisma/client';
import { buildApp } from '../../app';
import { prisma } from '../../db/prisma';

const run = process.env.DATABASE_URL ? describe : describe.skip;

function pad2(value: number) {
  return value.toString().padStart(2, '0');
}

function formatDateLocal(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function addDaysLocal(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function dateISO(daysFromToday: number) {
  return formatDateLocal(addDaysLocal(new Date(), daysFromToday));
}

run('analytics api', () => {
  const userId = '55555555-5555-5555-5555-555555555555';
  const headers = { 'x-dev-user': userId };

  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it('returns summary series and aggregates', async () => {
    const app = buildApp();

    try {
      const today = dateISO(0);
      const yesterday = dateISO(-1);
      const sixDaysAgo = dateISO(-6);

      await prisma.user.create({
        data: {
          id: userId,
          profile: {
            create: {
              units: 'metric',
              sex: 'unknown',
              activityLevel: 'sedentary',
              dietPreference: 'balanced',
              baselineTDEE: 2000,
              neatFactor: 0.8,
              goalMode: 'bulk',
              targetRateKgPerWeek: 0.2,
              autoAdjustKcal: 100,
              manualCalorieTargetEnabled: true,
              manualCalorieTargetKcal: 2500
            }
          }
        }
      });

      await prisma.foodEntry.create({
        data: {
          userId,
          dateISO: new Date(today),
          name: 'Rice',
          kcal: 500,
          protein: 10,
          fat: 5,
          carbs: 90,
          fiber: 4,
          multiplier: 1,
          type: 'manual'
        }
      });

      await prisma.foodEntry.create({
        data: {
          userId,
          dateISO: new Date(yesterday),
          name: 'Oats',
          kcal: 100,
          protein: 4,
          fat: 2,
          carbs: 15,
          fiber: 3,
          multiplier: 2,
          type: 'manual'
        }
      });

      await prisma.waterLog.create({
        data: {
          userId,
          dateISO: new Date(today),
          amountMl: 1200
        }
      });

      await prisma.extraActivity.create({
        data: {
          userId,
          dateISO: new Date(yesterday),
          type: 'walk',
          minutes: 30,
          intensity: 'moderate',
          kcalEst: 300
        }
      });

      await prisma.weighIn.create({
        data: {
          userId,
          dateISO: new Date(sixDaysAgo),
          weightKg: 80
        }
      });

      await prisma.weighIn.create({
        data: {
          userId,
          dateISO: new Date(today),
          weightKg: 82
        }
      });

      const day = await prisma.dayPlan.create({
        data: {
          userId,
          title: 'Test Day',
          emoji: ':test:'
        }
      });

      await prisma.completionLog.create({
        data: {
          userId,
          dateISO: new Date(today),
          dayId: day.id
        }
      });

      const response = await app.inject({
        method: 'GET',
        url: '/analytics/summary?range=7',
        headers
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.dates).toHaveLength(7);
      const todayIndex = body.dates.indexOf(today);
      const yesterdayIndex = body.dates.indexOf(yesterday);

      expect(todayIndex).toBe(body.dates.length - 1);
      expect(body.daily.intakeKcal[todayIndex]).toBe(500);
      expect(body.daily.intakeKcal[yesterdayIndex]).toBe(200);
      expect(body.daily.waterMl[todayIndex]).toBe(1200);
      expect(body.daily.extraActivityKcal[yesterdayIndex]).toBe(300);
      expect(body.daily.outtakeEstKcal[yesterdayIndex]).toBeCloseTo(2000 + 300 * 0.8);
      expect(body.daily.modeOffsetKcal[todayIndex]).toBeCloseTo((0.2 * 7700) / 7);
      expect(body.daily.targetKcal[todayIndex]).toBe(2500);
      expect(body.daily.completions.any[todayIndex]).toBe(true);
      expect(body.daily.completions.count[todayIndex]).toBe(1);
      expect(body.weight.weighIns).toHaveLength(2);
      expect(body.aggregates.actualRateKgPerWeek).toBeCloseTo((2 / 6) * 7, 4);
    } finally {
      await app.close();
    }
  });

  it('returns strength trends delta', async () => {
    const app = buildApp();

    try {
      const today = dateISO(0);
      const tenDaysAgo = dateISO(-10);

      await prisma.user.create({
        data: {
          id: userId,
          profile: {
            create: {
              units: 'metric',
              sex: 'unknown',
              activityLevel: 'sedentary',
              dietPreference: 'balanced'
            }
          }
        }
      });

      const day = await prisma.dayPlan.create({
        data: {
          userId,
          title: 'Strength',
          emoji: ':barbell:'
        }
      });

      const exercise = await prisma.plannedExercise.create({
        data: {
          userId,
          dayId: day.id,
          name: 'Deadlift',
          workingWeight: 140,
          targetRepsMin: 3,
          targetRepsMax: 5
        }
      });

      await prisma.topSetEntry.create({
        data: {
          userId,
          dateISO: new Date(tenDaysAgo),
          dayId: day.id,
          exerciseId: exercise.id,
          weight: 140,
          reps: 3,
          sets: 3,
          workSets: [{ weight: 135, reps: 4 }] as Prisma.JsonArray
        }
      });

      await prisma.topSetEntry.create({
        data: {
          userId,
          dateISO: new Date(today),
          dayId: day.id,
          exerciseId: exercise.id,
          weight: 150,
          reps: 4,
          sets: 3,
          workSets: [{ weight: 145, reps: 4 }] as Prisma.JsonArray
        }
      });

      const response = await app.inject({
        method: 'GET',
        url: '/analytics/strength-trends?range=30',
        headers
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.topDeltas).toHaveLength(1);
      expect(body.topDeltas[0].exerciseId).toBe(exercise.id);
      expect(body.topDeltas[0].exerciseName).toBe('Deadlift');
      expect(body.topDeltas[0].deltaWeight).toBe(10);
      expect(body.topDeltas[0].deltaReps).toBe(1);
    } finally {
      await app.close();
    }
  });
});
