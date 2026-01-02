import { z } from 'zod';
import { StepsQuerySchema, StepsUpsertSchema } from '../../modules/steps/schemas';
import type { OpenApiRegistry } from '../registry';
import { DateSchema, ErrorResponseSchema } from './shared';

const StepItemSchema = z.object({
  dateISO: DateSchema,
  steps: z.number().int().min(0)
});

const StepsListSchema = z.object({
  items: z.array(StepItemSchema)
});

const StepsUpsertResponseSchema = z.object({
  status: z.literal('OK'),
  item: StepItemSchema
});

export function registerStepsPaths(
  registry: OpenApiRegistry,
  paths: Record<string, Record<string, unknown>>
) {
  const errorSchema = registry.addSchema('ErrorResponse', ErrorResponseSchema);
  const stepItemSchema = registry.addSchema('StepItem', StepItemSchema);
  const stepsListSchema = registry.addSchema('StepsList', StepsListSchema);
  const stepsUpsertResponseSchema = registry.addSchema(
    'StepsUpsertResponse',
    StepsUpsertResponseSchema
  );

  registry.addPath(paths, '/steps', 'get', {
    tags: ['steps'],
    parameters: registry.parametersFromSchema(StepsQuerySchema, 'query'),
    responses: {
      200: {
        description: 'OK',
        content: {
          'application/json': {
            schema: stepsListSchema
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

  registry.addPath(paths, '/steps', 'post', {
    tags: ['steps'],
    requestBody: registry.requestBody(StepsUpsertSchema),
    responses: {
      200: {
        description: 'OK',
        content: {
          'application/json': {
            schema: stepsUpsertResponseSchema
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
