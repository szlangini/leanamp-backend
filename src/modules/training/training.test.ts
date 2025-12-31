import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../app';
import { prisma } from '../../db/prisma';
import { getAuthContext, AuthContext } from '../../test/auth';

const run = process.env.DATABASE_URL ? describe : describe.skip;

run('training api', () => {
  const email = 'training-test@leanamp.local';
  let app: ReturnType<typeof buildApp>;
  let auth: AuthContext;

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.emailOtp.deleteMany({ where: { email } });
    await prisma.user.deleteMany({ where: { email } });
    app = buildApp();
    auth = await getAuthContext(app, email);
  });

  beforeEach(async () => {
    await prisma.topSetEntry.deleteMany({ where: { userId: auth.userId } });
    await prisma.completionLog.deleteMany({ where: { userId: auth.userId } });
    await prisma.plannedExercise.deleteMany({ where: { userId: auth.userId } });
    await prisma.dayPlan.deleteMany({ where: { userId: auth.userId } });
    await prisma.extraActivity.deleteMany({ where: { userId: auth.userId } });
  });

  afterAll(async () => {
    await prisma.topSetEntry.deleteMany({ where: { userId: auth.userId } });
    await prisma.completionLog.deleteMany({ where: { userId: auth.userId } });
    await prisma.plannedExercise.deleteMany({ where: { userId: auth.userId } });
    await prisma.dayPlan.deleteMany({ where: { userId: auth.userId } });
    await prisma.extraActivity.deleteMany({ where: { userId: auth.userId } });
    await prisma.user.deleteMany({ where: { id: auth.userId } });
    await prisma.emailOtp.deleteMany({ where: { email } });
    await app.close();
    await prisma.$disconnect();
  });

  it('creates day and exercise and returns plan', async () => {
    const dayResponse = await app.inject({
      method: 'POST',
      url: '/training/plan/day',
      headers: auth.headers,
      payload: {
        title: 'Push',
        emoji: ':muscle:'
      }
    });

    expect(dayResponse.statusCode).toBe(200);
    const day = dayResponse.json();

    const exerciseResponse = await app.inject({
      method: 'POST',
      url: '/training/plan/exercise',
      headers: auth.headers,
      payload: {
        dayId: day.id,
        name: 'Bench Press',
        workingWeight: 100,
        targetRepsMin: 5,
        targetRepsMax: 8,
        notes: 'warmup',
        pinned: true
      }
    });

    expect(exerciseResponse.statusCode).toBe(200);
    const exercise = exerciseResponse.json();

    const planResponse = await app.inject({
      method: 'GET',
      url: '/training/plan',
      headers: auth.headers
    });

    expect(planResponse.statusCode).toBe(200);
    const plan = planResponse.json();
    expect(plan).toHaveLength(1);
    expect(plan[0].id).toBe(day.id);
    expect(plan[0].exercises).toHaveLength(1);
    expect(plan[0].exercises[0].id).toBe(exercise.id);
  });

  it('patches day and exercise', async () => {
    const dayResponse = await app.inject({
      method: 'POST',
      url: '/training/plan/day',
      headers: auth.headers,
      payload: {
        title: 'Legs',
        emoji: ':squat:'
      }
    });

    const day = dayResponse.json();

    const exerciseResponse = await app.inject({
      method: 'POST',
      url: '/training/plan/exercise',
      headers: auth.headers,
      payload: {
        dayId: day.id,
        name: 'Squat',
        workingWeight: 120,
        targetRepsMin: 3,
        targetRepsMax: 6
      }
    });

    const exercise = exerciseResponse.json();

    const patchDay = await app.inject({
      method: 'PATCH',
      url: `/training/plan/day/${day.id}`,
      headers: auth.headers,
      payload: {
        title: 'Lower'
      }
    });

    expect(patchDay.statusCode).toBe(200);
    expect(patchDay.json().title).toBe('Lower');

    const patchExercise = await app.inject({
      method: 'PATCH',
      url: `/training/plan/exercise/${exercise.id}`,
      headers: auth.headers,
      payload: {
        notes: 'add warmup',
        pinned: true
      }
    });

    expect(patchExercise.statusCode).toBe(200);
    expect(patchExercise.json().notes).toBe('add warmup');
    expect(patchExercise.json().pinned).toBe(true);
  });

  it('stores topset and lists range', async () => {
    const dayResponse = await app.inject({
      method: 'POST',
      url: '/training/plan/day',
      headers: auth.headers,
      payload: {
        title: 'Pull',
        emoji: ':pull:'
      }
    });

    const day = dayResponse.json();

    const exerciseResponse = await app.inject({
      method: 'POST',
      url: '/training/plan/exercise',
      headers: auth.headers,
      payload: {
        dayId: day.id,
        name: 'Row',
        workingWeight: 80,
        targetRepsMin: 8,
        targetRepsMax: 12
      }
    });

    const exercise = exerciseResponse.json();

    const topSetResponse = await app.inject({
      method: 'POST',
      url: '/training/topsets',
      headers: auth.headers,
      payload: {
        dateISO: '2024-01-10',
        dayId: day.id,
        exerciseId: exercise.id,
        weight: 85,
        reps: 8,
        sets: 3,
        workSets: [
          { weight: 80, reps: 10 },
          { weight: 85, reps: 8 }
        ]
      }
    });

    expect(topSetResponse.statusCode).toBe(200);
    expect(topSetResponse.json().weight).toBe(85);

    const listResponse = await app.inject({
      method: 'GET',
      url: '/training/topsets?from=2024-01-01&to=2024-01-31',
      headers: auth.headers
    });

    expect(listResponse.statusCode).toBe(200);
    const list = listResponse.json();
    expect(list).toHaveLength(1);
    expect(list[0].exerciseId).toBe(exercise.id);
  });

  it('creates and deletes completion', async () => {
    const dayResponse = await app.inject({
      method: 'POST',
      url: '/training/plan/day',
      headers: auth.headers,
      payload: {
        title: 'Full Body',
        emoji: ':full:'
      }
    });

    const day = dayResponse.json();

    const completionResponse = await app.inject({
      method: 'POST',
      url: '/training/completions',
      headers: auth.headers,
      payload: {
        dateISO: '2024-01-12',
        dayId: day.id
      }
    });

    expect(completionResponse.statusCode).toBe(200);

    const listResponse = await app.inject({
      method: 'GET',
      url: '/training/completions?from=2024-01-12&to=2024-01-12',
      headers: auth.headers
    });

    expect(listResponse.statusCode).toBe(200);
    const completions = listResponse.json();
    expect(completions).toHaveLength(1);
    expect(completions[0].dayId).toBe(day.id);

    const deleteResponse = await app.inject({
      method: 'DELETE',
      url: `/training/completions/2024-01-12?dayId=${day.id}`,
      headers: auth.headers
    });

    expect(deleteResponse.statusCode).toBe(204);
  });

  it('creates and lists extra activity', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/training/extra-activity',
      headers: auth.headers,
      payload: {
        dateISO: '2024-01-20',
        type: 'walk',
        minutes: 30,
        intensity: 'moderate',
        kcalEst: 120
      }
    });

    expect(createResponse.statusCode).toBe(200);

    const listResponse = await app.inject({
      method: 'GET',
      url: '/training/extra-activity?date=2024-01-20',
      headers: auth.headers
    });

    expect(listResponse.statusCode).toBe(200);
    const list = listResponse.json();
    expect(list).toHaveLength(1);
    expect(list[0].type).toBe('walk');
  });
});
