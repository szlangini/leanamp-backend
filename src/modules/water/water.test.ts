import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../app';
import { prisma } from '../../db/prisma';
import { getAuthContext, AuthContext } from '../../test/auth';

const run = process.env.DATABASE_URL ? describe : describe.skip;

run('water api', () => {
  const email = 'water-test@leanamp.local';
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
    await prisma.waterLog.deleteMany({ where: { userId: auth.userId } });
  });

  afterAll(async () => {
    await prisma.waterLog.deleteMany({ where: { userId: auth.userId } });
    await prisma.user.deleteMany({ where: { id: auth.userId } });
    await prisma.emailOtp.deleteMany({ where: { email } });
    await app.close();
    await prisma.$disconnect();
  });

  it('gets default water and upserts', async () => {
    const getResponse = await app.inject({
      method: 'GET',
      url: '/water?date=2024-01-03',
      headers: auth.headers
    });

    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.json()).toEqual({
      dateISO: '2024-01-03',
      amountMl: 0
    });

    const postResponse = await app.inject({
      method: 'POST',
      url: '/water',
      headers: auth.headers,
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
      headers: auth.headers
    });

    expect(getUpdated.statusCode).toBe(200);
    expect(getUpdated.json()).toEqual({
      dateISO: '2024-01-03',
      amountMl: 1200
    });
  });

  it('rejects invalid water payloads', async () => {
    const getResponse = await app.inject({
      method: 'GET',
      url: '/water?date=2024-1-03',
      headers: auth.headers
    });

    expect(getResponse.statusCode).toBe(400);
    expect(getResponse.json().error.code).toBe('bad_request');

    const postResponse = await app.inject({
      method: 'POST',
      url: '/water',
      headers: auth.headers,
      payload: {
        dateISO: '2024-01-03',
        amountMl: -10
      }
    });

    expect(postResponse.statusCode).toBe(400);
    expect(postResponse.json().error.code).toBe('bad_request');
  });
});
