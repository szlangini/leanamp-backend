import { z } from 'zod';
import {
  WeightCreateSchema,
  WeightDeleteParamsSchema,
  WeightQuerySchema
} from '../../modules/weights/schemas';
import type { OpenApiRegistry } from '../registry';
import { DateTimeSchema, ErrorResponseSchema, UUIDSchema } from './shared';

const WeighInSchema = z.object({
  id: UUIDSchema,
  userId: UUIDSchema,
  createdAt: DateTimeSchema,
  updatedAt: DateTimeSchema,
  dateISO: DateTimeSchema,
  weightKg: z.number(),
  note: z.string().nullable()
});

export function registerWeightsPaths(
  registry: OpenApiRegistry,
  paths: Record<string, Record<string, unknown>>
) {
  const errorSchema = registry.addSchema('ErrorResponse', ErrorResponseSchema);
  const weighInSchema = registry.addSchema('WeighIn', WeighInSchema);

  registry.addPath(paths, '/weights', 'get', {
    tags: ['weights'],
    parameters: registry.parametersFromSchema(WeightQuerySchema, 'query'),
    responses: {
      200: {
        description: 'OK',
        content: {
          'application/json': {
            schema: registry.schema(z.array(WeighInSchema))
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

  registry.addPath(paths, '/weights', 'post', {
    tags: ['weights'],
    requestBody: registry.requestBody(WeightCreateSchema),
    responses: {
      200: {
        description: 'OK',
        content: {
          'application/json': {
            schema: weighInSchema
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

  registry.addPath(paths, '/weights/{dateISO}', 'delete', {
    tags: ['weights'],
    parameters: registry.parametersFromSchema(WeightDeleteParamsSchema, 'path'),
    responses: {
      204: {
        description: 'No Content'
      },
      400: {
        description: 'Bad Request',
        content: {
          'application/json': {
            schema: errorSchema
          }
        }
      },
      404: {
        description: 'Not Found',
        content: {
          'application/json': {
            schema: errorSchema
          }
        }
      }
    }
  });
}
