import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../app';
import { prisma } from '../../db/prisma';
import { getAuthContext, AuthContext } from '../../test/auth';

const run = process.env.DATABASE_URL ? describe : describe.skip;

run('food api', () => {
  const email = 'food-test@leanamp.local';
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
    await prisma.foodEntry.deleteMany({ where: { userId: auth.userId } });
    await prisma.mealGroup.deleteMany({ where: { userId: auth.userId } });
    await prisma.foodTemplate.deleteMany({ where: { userId: auth.userId } });
  });

  afterAll(async () => {
    await prisma.foodEntry.deleteMany({ where: { userId: auth.userId } });
    await prisma.mealGroup.deleteMany({ where: { userId: auth.userId } });
    await prisma.foodTemplate.deleteMany({ where: { userId: auth.userId } });
    await prisma.user.deleteMany({ where: { id: auth.userId } });
    await prisma.emailOtp.deleteMany({ where: { email } });
    await app.close();
    await prisma.$disconnect();
  });

  it('creates, lists, and deletes templates', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/food/templates',
      headers: auth.headers,
      payload: {
        name: 'Oats',
        kcal: 150,
        protein: 5,
        fat: 3,
        carbs: 27,
        fiber: 4
      }
    });

    expect(createResponse.statusCode).toBe(200);
    const created = createResponse.json();
    expect(created.name).toBe('Oats');

    const listResponse = await app.inject({
      method: 'GET',
      url: '/food/templates',
      headers: auth.headers
    });

    expect(listResponse.statusCode).toBe(200);
    const list = listResponse.json();
    expect(list).toHaveLength(1);

    const deleteResponse = await app.inject({
      method: 'DELETE',
      url: `/food/templates/${created.id}`,
      headers: auth.headers
    });

    expect(deleteResponse.statusCode).toBe(204);
  });

  it('rejects invalid template payloads', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/food/templates',
      headers: auth.headers,
      payload: {}
    });

    expect(createResponse.statusCode).toBe(400);
    const body = createResponse.json();
    expect(body.error.code).toBe('bad_request');
  });

  it('creates and patches meal groups', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/food/meal-groups',
      headers: auth.headers,
      payload: {
        dateISO: '2024-01-01',
        title: 'Breakfast',
        isExpanded: true
      }
    });

    expect(createResponse.statusCode).toBe(200);
    const group = createResponse.json();
    expect(group.title).toBe('Breakfast');

    const patchResponse = await app.inject({
      method: 'PATCH',
      url: `/food/meal-groups/${group.id}`,
      headers: auth.headers,
      payload: {
        title: 'Morning',
        isExpanded: false
      }
    });

    expect(patchResponse.statusCode).toBe(200);
    const updated = patchResponse.json();
    expect(updated.title).toBe('Morning');
    expect(updated.isExpanded).toBe(false);
  });

  it('rejects empty meal group patch', async () => {
    const patchResponse = await app.inject({
      method: 'PATCH',
      url: '/food/meal-groups/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      headers: auth.headers,
      payload: {}
    });

    expect(patchResponse.statusCode).toBe(400);
    const body = patchResponse.json();
    expect(body.error.code).toBe('bad_request');
  });

  it('creates, lists, updates, and deletes entries', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/food/entries',
      headers: auth.headers,
      payload: {
        dateISO: '2024-01-02',
        name: 'Oats',
        kcal: 150,
        protein: 5,
        fat: 3,
        carbs: 27,
        fiber: 4,
        type: 'manual'
      }
    });

    expect(createResponse.statusCode).toBe(200);
    const entry = createResponse.json();

    const listResponse = await app.inject({
      method: 'GET',
      url: '/food/entries?date=2024-01-02',
      headers: auth.headers
    });

    expect(listResponse.statusCode).toBe(200);
    const entries = listResponse.json();
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe(entry.id);

    const patchResponse = await app.inject({
      method: 'PATCH',
      url: `/food/entries/${entry.id}`,
      headers: auth.headers,
      payload: {
        note: 'with berries',
        multiplier: 1.5
      }
    });

    expect(patchResponse.statusCode).toBe(200);
    const updated = patchResponse.json();
    expect(updated.note).toBe('with berries');
    expect(updated.multiplier).toBe(1.5);

    const deleteResponse = await app.inject({
      method: 'DELETE',
      url: `/food/entries/${entry.id}`,
      headers: auth.headers
    });

    expect(deleteResponse.statusCode).toBe(204);
  });

  it('rejects invalid entry queries and unknown ids', async () => {
    const listResponse = await app.inject({
      method: 'GET',
      url: '/food/entries?date=2024-1-01',
      headers: auth.headers
    });

    expect(listResponse.statusCode).toBe(400);
    expect(listResponse.json().error.code).toBe('bad_request');

    const createResponse = await app.inject({
      method: 'POST',
      url: '/food/entries',
      headers: auth.headers,
      payload: {
        dateISO: '2024-01-02',
        name: 'Oats',
        kcal: 150,
        protein: 5,
        fat: 3,
        carbs: 27,
        fiber: 4,
        type: 'manual',
        groupId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
      }
    });

    expect(createResponse.statusCode).toBe(404);
    expect(createResponse.json().error.code).toBe('not_found');

    const deleteResponse = await app.inject({
      method: 'DELETE',
      url: '/food/entries/cccccccc-cccc-cccc-cccc-cccccccccccc',
      headers: auth.headers
    });

    expect(deleteResponse.statusCode).toBe(404);
    expect(deleteResponse.json().error.code).toBe('not_found');
  });
});
