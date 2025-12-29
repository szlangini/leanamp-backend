import fastify, { FastifyInstance } from 'fastify';
import { env } from './config/env';
import devAuth from './plugins/dev-auth';
import healthPlugin from './plugins/health';
import profileRoutes from './modules/profile/routes';
import foodRoutes from './modules/food/routes';
import waterRoutes from './modules/water/routes';
import trainingRoutes from './modules/training/routes';
import analyticsRoutes from './modules/analytics/routes';
import openapiPlugin from './plugins/openapi';

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

  devAuth(app);
  app.register(healthPlugin);
  app.register(profileRoutes);
  app.register(foodRoutes, { prefix: '/food' });
  app.register(waterRoutes, { prefix: '/water' });
  app.register(trainingRoutes, { prefix: '/training' });
  app.register(analyticsRoutes, { prefix: '/analytics' });
  app.register(openapiPlugin);

  return app;
}
