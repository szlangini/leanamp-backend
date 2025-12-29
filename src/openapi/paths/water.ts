import { z } from 'zod';
import { WaterQuerySchema, WaterUpsertSchema } from '../../modules/water/schemas';
import type { OpenApiRegistry } from '../registry';
import { DateSchema, ErrorResponseSchema } from './shared';

const WaterLogSchema = z.object({
  dateISO: DateSchema,
  amountMl: z.number().int()
});

export function registerWaterPaths(
  registry: OpenApiRegistry,
  paths: Record<string, Record<string, unknown>>
) {
  const errorSchema = registry.addSchema('ErrorResponse', ErrorResponseSchema);
  const waterSchema = registry.addSchema('WaterLog', WaterLogSchema);

  registry.addPath(paths, '/water', 'get', {
    tags: ['water'],
    parameters: registry.parametersFromSchema(WaterQuerySchema, 'query'),
    responses: {
      200: {
        description: 'OK',
        content: {
          'application/json': {
            schema: waterSchema
          }
        }
      },
      400: {
        description: 'Bad Request',
        content: {
          'application/json': {
            schema: errorSchema
          }
        }
      }
    }
  });

  registry.addPath(paths, '/water', 'post', {
    tags: ['water'],
    requestBody: registry.requestBody(WaterUpsertSchema),
    responses: {
      200: {
        description: 'OK',
        content: {
          'application/json': {
            schema: waterSchema
          }
        }
      },
      400: {
        description: 'Bad Request',
        content: {
          'application/json': {
            schema: errorSchema
          }
        }
      }
    }
  });
}
