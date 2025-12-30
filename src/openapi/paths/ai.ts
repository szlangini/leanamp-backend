import {
  AiActivityEstimateInputSchema,
  AiActivityEstimateResponseSchema,
  AiFoodDescribeInputSchema,
  AiFoodDescribeResponseSchema,
  AiInsightsInputSchema,
  AiInsightsResponseSchema
} from '../../modules/ai/schemas';
import type { OpenApiRegistry } from '../registry';
import { ErrorResponseSchema } from './shared';

export function registerAiPaths(
  registry: OpenApiRegistry,
  paths: Record<string, Record<string, unknown>>
) {
  const errorSchema = registry.addSchema('ErrorResponse', ErrorResponseSchema);

  registry.addPath(paths, '/ai/insights', 'post', {
    tags: ['ai'],
    requestBody: registry.requestBody(AiInsightsInputSchema),
    responses: {
      200: registry.response(AiInsightsResponseSchema),
      400: { description: 'Bad Request', content: { 'application/json': { schema: errorSchema } } },
      429: { description: 'Too Many Requests', content: { 'application/json': { schema: errorSchema } } },
      501: { description: 'Not Implemented', content: { 'application/json': { schema: errorSchema } } },
      502: { description: 'Bad Gateway', content: { 'application/json': { schema: errorSchema } } }
    }
  });

  registry.addPath(paths, '/ai/activity/estimate', 'post', {
    tags: ['ai'],
    requestBody: registry.requestBody(AiActivityEstimateInputSchema),
    responses: {
      200: registry.response(AiActivityEstimateResponseSchema),
      400: { description: 'Bad Request', content: { 'application/json': { schema: errorSchema } } },
      429: { description: 'Too Many Requests', content: { 'application/json': { schema: errorSchema } } },
      501: { description: 'Not Implemented', content: { 'application/json': { schema: errorSchema } } },
      502: { description: 'Bad Gateway', content: { 'application/json': { schema: errorSchema } } }
    }
  });

  registry.addPath(paths, '/ai/food/describe', 'post', {
    tags: ['ai'],
    requestBody: registry.requestBody(AiFoodDescribeInputSchema),
    responses: {
      200: registry.response(AiFoodDescribeResponseSchema),
      400: { description: 'Bad Request', content: { 'application/json': { schema: errorSchema } } },
      429: { description: 'Too Many Requests', content: { 'application/json': { schema: errorSchema } } },
      501: { description: 'Not Implemented', content: { 'application/json': { schema: errorSchema } } },
      502: { description: 'Bad Gateway', content: { 'application/json': { schema: errorSchema } } }
    }
  });

  registry.addPath(paths, '/ai/voice-to-meal', 'post', {
    tags: ['ai'],
    requestBody: registry.requestBody(AiFoodDescribeInputSchema),
    responses: {
      200: registry.response(AiFoodDescribeResponseSchema),
      400: { description: 'Bad Request', content: { 'application/json': { schema: errorSchema } } },
      429: { description: 'Too Many Requests', content: { 'application/json': { schema: errorSchema } } },
      501: { description: 'Not Implemented', content: { 'application/json': { schema: errorSchema } } },
      502: { description: 'Bad Gateway', content: { 'application/json': { schema: errorSchema } } }
    }
  });

  registry.addPath(paths, '/ai/food/photo', 'post', {
    tags: ['ai'],
    responses: {
      501: { description: 'Not Implemented', content: { 'application/json': { schema: errorSchema } } }
    }
  });

  registry.addPath(paths, '/ai/bodyfat/photos', 'post', {
    tags: ['ai'],
    responses: {
      501: { description: 'Not Implemented', content: { 'application/json': { schema: errorSchema } } }
    }
  });
}
