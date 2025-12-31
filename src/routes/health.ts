import type { FastifyInstance } from 'fastify';
import { env } from '../config/env';

export default async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async () => {
    const payload: Record<string, unknown> = {
      ok: true,
      service: 'leanamp-backend',
      timeISO: new Date().toISOString(),
      version: '0.0.0'
    };

    if (env.NODE_ENV === 'development' && env.OPENAPI_ENABLED) {
      payload.openapi = {
        enabled: true,
        specUrl: '/openapi.json',
        docsUrl: '/docs'
      };
    }

    return payload;
  });
}
