import { describe, expect, it } from 'vitest';
import { buildApp } from '../app';

describe('GET /health', () => {
  it('returns a healthy payload', async () => {
    const app = buildApp();

    try {
      const response = await app.inject({ method: 'GET', url: '/health' });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');

      const body = response.json();
      expect(body).toMatchObject({
        ok: true,
        service: 'leanamp-backend',
        version: '0.0.0'
      });
      expect(typeof body.timeISO).toBe('string');
    } finally {
      await app.close();
    }
  });
});
