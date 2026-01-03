import type { FastifyInstance } from 'fastify';
import { env } from '../../config/env';
import { badRequest, sendError } from '../../utils/errors';
import {
  AiActivityEstimateInputSchema,
  AiFoodDescribeInputSchema,
  AiImageInputSchema,
  AiInsightsInputSchema
} from './schemas';
import { createAiService, AiServiceError, type AiProvider } from './service';

const DISALLOWED_TEXT_PATTERNS = [
  /\b(nude|nudes|porn|xxx|onlyfans|sex)\b/i
];

function isTextDisallowed(text: string) {
  return DISALLOWED_TEXT_PATTERNS.some((pattern) => pattern.test(text));
}

export type AiRoutesOptions = {
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

export default async function aiRoutes(
  app: FastifyInstance,
  options: AiRoutesOptions = {}
) {
  const service = createAiService(options);

  app.addHook('preHandler', async (_request, reply) => {
    if (!env.AI_ENABLED) {
      return sendError(reply, 501, 'AI_DISABLED', 'AI is disabled');
    }
  });

  const aiRateLimit = {
    max: env.NODE_ENV === 'test' ? 1000 : 10,
    timeWindow: '1 minute'
  };

  app.post(
    '/insights',
    {
      config: {
        rateLimit: aiRateLimit
      }
    },
    async (request, reply) => {
      const parsed = AiInsightsInputSchema.safeParse(request.body);
      if (!parsed.success) {
        return badRequest(reply, 'Invalid insights payload', parsed.error.flatten());
      }

      try {
        const result = await service.insights(request.user?.id ?? null, parsed.data);
        return reply.send(result);
      } catch (error) {
        if (error instanceof AiServiceError) {
          return sendError(reply, error.status, error.code, error.message);
        }
        throw error;
      }
    }
  );

  app.post(
    '/activity/estimate',
    {
      config: {
        rateLimit: aiRateLimit
      }
    },
    async (request, reply) => {
      const parsed = AiActivityEstimateInputSchema.safeParse(request.body);
      if (!parsed.success) {
        return badRequest(reply, 'Invalid activity payload', parsed.error.flatten());
      }

      try {
        const result = await service.activityEstimate(request.user?.id ?? null, parsed.data);
        return reply.send(result);
      } catch (error) {
        if (error instanceof AiServiceError) {
          return sendError(reply, error.status, error.code, error.message);
        }
        throw error;
      }
    }
  );

  app.post(
    '/food/describe',
    {
      config: {
        rateLimit: aiRateLimit
      }
    },
    async (request, reply) => {
      const parsed = AiFoodDescribeInputSchema.safeParse(request.body);
      if (!parsed.success) {
        return badRequest(reply, 'Invalid food text payload', parsed.error.flatten());
      }

      if (isTextDisallowed(parsed.data.text)) {
        return sendError(reply, 422, 'AI_TEXT_DISALLOWED', 'Text content not allowed');
      }

      try {
        const result = await service.foodDescribe(request.user?.id ?? null, parsed.data);
        return reply.send(result);
      } catch (error) {
        if (error instanceof AiServiceError) {
          return sendError(reply, error.status, error.code, error.message);
        }
        throw error;
      }
    }
  );

  app.post(
    '/voice-to-meal',
    {
      config: {
        rateLimit: aiRateLimit
      }
    },
    async (request, reply) => {
      const parsed = AiFoodDescribeInputSchema.safeParse(request.body);
      if (!parsed.success) {
        return badRequest(reply, 'Invalid voice payload', parsed.error.flatten());
      }

      if (isTextDisallowed(parsed.data.text)) {
        return sendError(reply, 422, 'AI_TEXT_DISALLOWED', 'Text content not allowed');
      }

      try {
        const result = await service.voiceToMeal(request.user?.id ?? null, parsed.data);
        return reply.send(result);
      } catch (error) {
        if (error instanceof AiServiceError) {
          return sendError(reply, error.status, error.code, error.message);
        }
        throw error;
      }
    }
  );

  app.post(
    '/food/photo',
    {
      config: {
        rateLimit: aiRateLimit
      }
    },
    async (request, reply) => {
      const parsed = AiImageInputSchema.safeParse(request.body);
      if (!parsed.success) {
        return badRequest(reply, 'Invalid food photo payload', parsed.error.flatten());
      }

      try {
        const result = await service.foodPhoto(request.user?.id ?? null, parsed.data);
        return reply.send(result);
      } catch (error) {
        if (error instanceof AiServiceError) {
          return sendError(reply, error.status, error.code, error.message);
        }
        throw error;
      }
    }
  );

  app.post(
    '/bodyfat/photos',
    {
      config: {
        rateLimit: aiRateLimit
      }
    },
    async (request, reply) => {
      const parsed = AiImageInputSchema.safeParse(request.body);
      if (!parsed.success) {
        return badRequest(reply, 'Invalid bodyfat photo payload', parsed.error.flatten());
      }

      try {
        const result = await service.bodyfatPhoto(request.user?.id ?? null, parsed.data);
        return reply.send(result);
      } catch (error) {
        if (error instanceof AiServiceError) {
          return sendError(reply, error.status, error.code, error.message);
        }
        throw error;
      }
    }
  );
}
