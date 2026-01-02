import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../app';
import { prisma } from '../../db/prisma';
import { getAuthContext, AuthContext } from '../../test/auth';

const run = process.env.DATABASE_URL ? describe : describe.skip;

run('steps api', () => {
  const email = 'steps-test@leanamp.local';
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
    await prisma.stepLog.deleteMany({ where: { userId: auth.userId } });
  });

  afterAll(async () => {
    await prisma.stepLog.deleteMany({ where: { userId: auth.userId } });
    await prisma.user.deleteMany({ where: { id: auth.userId } });
    await prisma.emailOtp.deleteMany({ where: { email } });
    await app.close();
    await prisma.$disconnect();
  });

  it('upserts and lists steps', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/steps',
      headers: auth.headers,
      payload: {
        dateISO: '2024-03-01',
        steps: 8420
      }
    });

    expect(createResponse.statusCode).toBe(200);
    const created = createResponse.json();
    expect(created.item.steps).toBe(8420);

    const updateResponse = await app.inject({
      method: 'POST',
      url: '/steps',
      headers: auth.headers,
      payload: {
        dateISO: '2024-03-01',
        steps: 9000
      }
    });

    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.json().item.steps).toBe(9000);

    const listResponse = await app.inject({
      method: 'GET',
      url: '/steps?from=2024-03-01&to=2024-03-02',
      headers: auth.headers
    });

    expect(listResponse.statusCode).toBe(200);
    const list = listResponse.json();
    expect(list.items).toHaveLength(1);
    expect(list.items[0].dateISO).toBe('2024-03-01');
  });

  it('rejects invalid steps query', async () => {
    const listResponse = await app.inject({
      method: 'GET',
      url: '/steps?from=2024-03-03&to=2024-03-01',
      headers: auth.headers
    });

    expect(listResponse.statusCode).toBe(400);
    expect(listResponse.json().error.code).toBe('bad_request');
  });

  it('rejects invalid steps payload', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/steps',
      headers: auth.headers,
      payload: {
        dateISO: '2024-03-01',
        steps: -5
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('bad_request');
  });
});
