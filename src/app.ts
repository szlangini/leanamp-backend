import fastify, { FastifyInstance } from 'fastify';
import { env } from './config/env';
import authPlugin from './plugins/auth';
import healthPlugin from './plugins/health';
import authRoutes from './modules/auth/routes';
import profileRoutes from './modules/profile/routes';
import foodRoutes from './modules/food/routes';
import foodCatalogRoutes from './modules/foodCatalog/routes';
import waterRoutes from './modules/water/routes';
import weightRoutes from './modules/weights/routes';
import stepsRoutes from './modules/steps/routes';
import trainingRoutes from './modules/training/routes';
import analyticsRoutes from './modules/analytics/routes';
import aiRoutes from './modules/ai/routes';
import onboardingRoutes from './modules/onboarding/routes';
import openapiPlugin from './plugins/openapi';
import rateLimit from '@fastify/rate-limit';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import type { FoodCatalogProvider } from './modules/foodCatalog/providers/types';
import type { AiProvider } from './modules/ai/service';

type BuildAppOptions = {
  foodCatalog?: {
    providers?: {
      off?: FoodCatalogProvider;
      usda?: FoodCatalogProvider;
    };
    enableOff?: boolean;
    enableUsda?: boolean;
    internalOnly?: boolean;
    cacheOnlyOnProviderDown?: boolean;
  };
  ai?: {
    provider?: AiProvider;
    cache?: Map<string, { expiresAt: number; payload: unknown }>;
    limits?: {
      dailyTotal?: number;
      dailyText?: number;
      dailyImage?: number;
      dailyHeavy?: number;
    };
    now?: () => Date;
  };
};

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const logger = env.DEV_LOG
    ? {
        level: env.NODE_ENV === 'production' ? 'warn' : 'info',
        redact: {
          paths: [
            'req.headers',
            'req.headers.authorization',
            'req.headers.cookie',
            'req.headers.x-dev-key',
            'req.headers.x-dev-user',
            'req.body',
            'res.headers',
            'res.headers.set-cookie'
          ],
          remove: true
        }
      }
    : false;

  const app = fastify({ logger, trustProxy: env.TRUST_PROXY });

  app.register(helmet);

  if (env.NODE_ENV === 'production') {
    const allowedOrigins = env.ALLOWED_ORIGINS.split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    app.register(cors, {
      origin: (origin, callback) => {
        if (!origin) {
          callback(null, true);
          return;
        }
        if (allowedOrigins.length === 0) {
          callback(null, false);
          return;
        }
        callback(null, allowedOrigins.includes(origin));
      },
      credentials: false
    });
  } else {
    app.register(cors, {
      origin: true,
      credentials: false
    });
  }

  app.register(rateLimit, {
    global: true,
    max: env.NODE_ENV === 'test' ? 10000 : 120,
    timeWindow: '1 minute',
    keyGenerator: (request) => request.ip
  });
  authPlugin(app);
  app.register(healthPlugin);
  app.register(authRoutes, { prefix: '/auth' });
  app.register(profileRoutes);
  app.register(foodRoutes, { prefix: '/food' });
  app.register(foodCatalogRoutes, {
    prefix: '/food/catalog',
    providers: options.foodCatalog?.providers,
    enableOff: options.foodCatalog?.enableOff,
    enableUsda: options.foodCatalog?.enableUsda,
    internalOnly: options.foodCatalog?.internalOnly,
    cacheOnlyOnProviderDown: options.foodCatalog?.cacheOnlyOnProviderDown
  });
  app.register(waterRoutes, { prefix: '/water' });
  app.register(weightRoutes, { prefix: '/weights' });
  app.register(stepsRoutes, { prefix: '/steps' });
  app.register(trainingRoutes, { prefix: '/training' });
  app.register(analyticsRoutes, { prefix: '/analytics' });
  app.register(aiRoutes, {
    prefix: '/ai',
    provider: options.ai?.provider,
    cache: options.ai?.cache,
    limits: options.ai?.limits,
    now: options.ai?.now
  });
  app.register(onboardingRoutes);
  app.register(openapiPlugin);

  return app;
}
