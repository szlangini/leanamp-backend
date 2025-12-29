import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../app';
import { prisma } from '../../db/prisma';

const run = process.env.DATABASE_URL ? describe : describe.skip;

run('water api', () => {
  const userId = '33333333-3333-3333-3333-333333333333';
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

  it('gets default water and upserts', async () => {
    const app = buildApp();

    try {
      const getResponse = await app.inject({
        method: 'GET',
        url: '/water?date=2024-01-03',
        headers
      });

      expect(getResponse.statusCode).toBe(200);
      expect(getResponse.json()).toEqual({
        dateISO: '2024-01-03',
        amountMl: 0
      });

      const postResponse = await app.inject({
        method: 'POST',
        url: '/water',
        headers,
        payload: {
          dateISO: '2024-01-03',
          amountMl: 1200
        }
      });

      expect(postResponse.statusCode).toBe(200);
      expect(postResponse.json()).toEqual({
        dateISO: '2024-01-03',
        amountMl: 1200
      });

      const getUpdated = await app.inject({
        method: 'GET',
        url: '/water?date=2024-01-03',
        headers
      });

      expect(getUpdated.statusCode).toBe(200);
      expect(getUpdated.json()).toEqual({
        dateISO: '2024-01-03',
        amountMl: 1200
      });
    } finally {
      await app.close();
    }
  });

  it('rejects invalid water payloads', async () => {
    const app = buildApp();

    try {
      const getResponse = await app.inject({
        method: 'GET',
        url: '/water?date=2024-1-03',
        headers
      });

      expect(getResponse.statusCode).toBe(400);
      expect(getResponse.json().error.code).toBe('bad_request');

      const postResponse = await app.inject({
        method: 'POST',
        url: '/water',
        headers,
        payload: {
          dateISO: '2024-01-03',
          amountMl: -10
        }
      });

      expect(postResponse.statusCode).toBe(400);
      expect(postResponse.json().error.code).toBe('bad_request');
    } finally {
      await app.close();
    }
  });
});
