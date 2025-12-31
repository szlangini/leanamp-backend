import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../app';
import { prisma } from '../../db/prisma';
import { getAuthContext, AuthContext } from '../../test/auth';

const run = process.env.DATABASE_URL ? describe : describe.skip;

run('weights api', () => {
  const email = 'weights-test@leanamp.local';
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
    await prisma.weighIn.deleteMany({ where: { userId: auth.userId } });
  });

  afterAll(async () => {
    await prisma.weighIn.deleteMany({ where: { userId: auth.userId } });
    await prisma.user.deleteMany({ where: { id: auth.userId } });
    await prisma.emailOtp.deleteMany({ where: { email } });
    await app.close();
    await prisma.$disconnect();
  });

  it('upserts, lists, and deletes weigh-ins', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/weights',
      headers: auth.headers,
      payload: {
        dateISO: '2024-02-01',
        weightKg: 80.5
      }
    });

    expect(createResponse.statusCode).toBe(200);
    const first = createResponse.json();
    expect(first.weightKg).toBe(80.5);

    const upsertResponse = await app.inject({
      method: 'POST',
      url: '/weights',
      headers: auth.headers,
      payload: {
        dateISO: '2024-02-01',
        weightKg: 81.2,
        note: 'after workout'
      }
    });

    expect(upsertResponse.statusCode).toBe(200);
    const updated = upsertResponse.json();
    expect(updated.weightKg).toBe(81.2);
    expect(updated.note).toBe('after workout');

    const listResponse = await app.inject({
      method: 'GET',
      url: '/weights?from=2024-02-01&to=2024-02-02',
      headers: auth.headers
    });

    expect(listResponse.statusCode).toBe(200);
    const list = listResponse.json();
    expect(list).toHaveLength(1);
    expect(list[0].dateISO).toBeTruthy();

    const deleteResponse = await app.inject({
      method: 'DELETE',
      url: '/weights/2024-02-01',
      headers: auth.headers
    });

    expect(deleteResponse.statusCode).toBe(204);
  });

  it('rejects invalid weight query', async () => {
    const listResponse = await app.inject({
      method: 'GET',
      url: '/weights?from=2024-02-03&to=2024-02-01',
      headers: auth.headers
    });

    expect(listResponse.statusCode).toBe(400);
    expect(listResponse.json().error.code).toBe('bad_request');
  });
});
