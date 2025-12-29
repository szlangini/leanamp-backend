import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app';
import { prisma } from '../../db/prisma';
import { getAuthContext, AuthContext } from '../../test/auth';

const run = process.env.DATABASE_URL ? describe : describe.skip;

run('profile api', () => {
  const email = 'profile-test@leanamp.local';
  let app: ReturnType<typeof buildApp>;
  let auth: AuthContext;

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.emailOtp.deleteMany({ where: { email } });
    await prisma.user.deleteMany({ where: { email } });
    app = buildApp();
    auth = await getAuthContext(app, email);
    await prisma.profile.deleteMany({ where: { userId: auth.userId } });
  });

  afterAll(async () => {
    await prisma.profile.deleteMany({ where: { userId: auth.userId } });
    await prisma.user.deleteMany({ where: { id: auth.userId } });
    await prisma.emailOtp.deleteMany({ where: { email } });
    await app.close();
    await prisma.$disconnect();
  });

  it('stores and returns bulk profile fields', async () => {
    const payload = {
      goalMode: 'bulk',
      targetRateKgPerWeek: 0.2,
      neatFactor: 0.8,
      baselineSteps: 7000,
      manualCalorieTargetEnabled: true,
      manualCalorieTargetKcal: 2800
    };

    const putResponse = await app.inject({
      method: 'PUT',
      url: '/profile',
      headers: auth.headers,
      payload
    });

    expect(putResponse.statusCode).toBe(200);

    const getResponse = await app.inject({
      method: 'GET',
      url: '/profile',
      headers: auth.headers
    });

    expect(getResponse.statusCode).toBe(200);

    const body = getResponse.json();
    expect(body.goalMode).toBe('bulk');
    expect(body.targetRateKgPerWeek).toBe(0.2);
    expect(body.neatFactor).toBe(0.8);
    expect(body.baselineSteps).toBe(7000);
    expect(body.manualCalorieTargetEnabled).toBe(true);
    expect(body.manualCalorieTargetKcal).toBe(2800);
    expect(Array.isArray(body.weeklyAdjustLog)).toBe(true);
    expect(body.weeklyAdjustLog).toEqual([]);
  });

  it('rejects invalid profile payloads', async () => {
    const putResponse = await app.inject({
      method: 'PUT',
      url: '/profile',
      headers: auth.headers,
      payload: {
        goalMode: 'invalid'
      }
    });

    expect(putResponse.statusCode).toBe(400);
    expect(putResponse.json().error.code).toBe('bad_request');
  });
});
