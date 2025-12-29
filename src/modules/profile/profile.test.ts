import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app';
import { prisma } from '../../db/prisma';

const run = process.env.DATABASE_URL ? describe : describe.skip;

run('profile api', () => {
  const userId = '11111111-1111-1111-1111-111111111111';
  const headers = { 'x-user-id': userId };

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.profile.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  afterAll(async () => {
    await prisma.profile.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it('stores and returns bulk profile fields', async () => {
    const app = buildApp();

    try {
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
        headers,
        payload
      });

      expect(putResponse.statusCode).toBe(200);

      const getResponse = await app.inject({
        method: 'GET',
        url: '/profile',
        headers
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
    } finally {
      await app.close();
    }
  });

  it('rejects invalid profile payloads', async () => {
    const app = buildApp();

    try {
      const putResponse = await app.inject({
        method: 'PUT',
        url: '/profile',
        headers,
        payload: {
          goalMode: 'invalid'
        }
      });

      expect(putResponse.statusCode).toBe(400);
      expect(putResponse.json().error.code).toBe('bad_request');
    } finally {
      await app.close();
    }
  });
});
