import { z } from 'zod';
import { OnboardingUpdateSchema } from '../../modules/onboarding/schemas';
import type { OpenApiRegistry } from '../registry';
import { DateTimeSchema, ErrorResponseSchema } from './shared';

const OnboardingStateSchema = z.object({
  hasOnboarded: z.boolean(),
  currentStep: z.number().int().min(1).max(4).optional(),
  completedAt: DateTimeSchema.optional().nullable(),
  updatedAt: DateTimeSchema.optional()
});

const OnboardingPostResponseSchema = z.object({
  status: z.literal('OK'),
  state: OnboardingStateSchema
});

export function registerOnboardingPaths(
  registry: OpenApiRegistry,
  paths: Record<string, Record<string, unknown>>
) {
  const errorSchema = registry.addSchema('ErrorResponse', ErrorResponseSchema);
  const onboardingStateSchema = registry.addSchema('OnboardingState', OnboardingStateSchema);
  const onboardingPostResponseSchema = registry.addSchema(
    'OnboardingPostResponse',
    OnboardingPostResponseSchema
  );

  registry.addPath(paths, '/onboarding', 'get', {
    tags: ['onboarding'],
    responses: {
      200: {
        description: 'OK',
        content: {
          'application/json': {
            schema: onboardingStateSchema
          }
        }
      }
    }
  });

  registry.addPath(paths, '/onboarding', 'post', {
    tags: ['onboarding'],
    requestBody: registry.requestBody(OnboardingUpdateSchema),
    responses: {
      200: {
        description: 'OK',
        content: {
          'application/json': {
            schema: onboardingPostResponseSchema
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
