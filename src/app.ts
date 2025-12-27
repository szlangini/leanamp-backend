import fastify, { FastifyInstance } from 'fastify';
import { env } from './config/env';
import healthPlugin from './plugins/health';

export function buildApp(): FastifyInstance {
  const logger = env.DEV_LOG
    ? {
        level: env.NODE_ENV === 'production' ? 'warn' : 'info',
        redact: {
          paths: ['req.headers', 'req.body', 'res.headers'],
          remove: true
        }
      }
    : false;

  const app = fastify({ logger });

  app.register(healthPlugin);

  return app;
}
