import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../app';
import { prisma } from '../../db/prisma';

const run = process.env.DATABASE_URL ? describe : describe.skip;

run('food api', () => {
  const userId = '22222222-2222-2222-2222-222222222222';
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

  it('creates, lists, and deletes templates', async () => {
    const app = buildApp();

    try {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/food/templates',
        headers,
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
        headers
      });

      expect(listResponse.statusCode).toBe(200);
      const list = listResponse.json();
      expect(list).toHaveLength(1);

      const deleteResponse = await app.inject({
        method: 'DELETE',
        url: `/food/templates/${created.id}`,
        headers
      });

      expect(deleteResponse.statusCode).toBe(204);
    } finally {
      await app.close();
    }
  });

  it('rejects invalid template payloads', async () => {
    const app = buildApp();

    try {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/food/templates',
        headers,
        payload: {}
      });

      expect(createResponse.statusCode).toBe(400);
      const body = createResponse.json();
      expect(body.error.code).toBe('bad_request');
    } finally {
      await app.close();
    }
  });

  it('creates and patches meal groups', async () => {
    const app = buildApp();

    try {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/food/meal-groups',
        headers,
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
        headers,
        payload: {
          title: 'Morning',
          isExpanded: false
        }
      });

      expect(patchResponse.statusCode).toBe(200);
      const updated = patchResponse.json();
      expect(updated.title).toBe('Morning');
      expect(updated.isExpanded).toBe(false);
    } finally {
      await app.close();
    }
  });

  it('rejects empty meal group patch', async () => {
    const app = buildApp();

    try {
      const patchResponse = await app.inject({
        method: 'PATCH',
        url: '/food/meal-groups/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        headers,
        payload: {}
      });

      expect(patchResponse.statusCode).toBe(400);
      const body = patchResponse.json();
      expect(body.error.code).toBe('bad_request');
    } finally {
      await app.close();
    }
  });

  it('creates, lists, updates, and deletes entries', async () => {
    const app = buildApp();

    try {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/food/entries',
        headers,
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
        headers
      });

      expect(listResponse.statusCode).toBe(200);
      const entries = listResponse.json();
      expect(entries).toHaveLength(1);
      expect(entries[0].id).toBe(entry.id);

      const patchResponse = await app.inject({
        method: 'PATCH',
        url: `/food/entries/${entry.id}`,
        headers,
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
        headers
      });

      expect(deleteResponse.statusCode).toBe(204);
    } finally {
      await app.close();
    }
  });

  it('rejects invalid entry queries and unknown ids', async () => {
    const app = buildApp();

    try {
      const listResponse = await app.inject({
        method: 'GET',
        url: '/food/entries?date=2024-1-01',
        headers
      });

      expect(listResponse.statusCode).toBe(400);
      expect(listResponse.json().error.code).toBe('bad_request');

      const createResponse = await app.inject({
        method: 'POST',
        url: '/food/entries',
        headers,
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
        headers
      });

      expect(deleteResponse.statusCode).toBe(404);
      expect(deleteResponse.json().error.code).toBe('not_found');
    } finally {
      await app.close();
    }
  });
});
