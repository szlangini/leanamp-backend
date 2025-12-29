import { z } from 'zod';
import type { OpenApiRegistry } from '../registry';
import { EmailStartSchema, EmailVerifySchema, SignoutSchema } from '../../modules/auth/schemas';
import { DateTimeSchema, ErrorResponseSchema, UUIDSchema } from './shared';

const AuthUserSchema = z.object({
  id: UUIDSchema,
  email: z.string().email().nullable(),
  displayName: z.string().nullable()
});

const AuthStartResponseSchema = z.object({
  ok: z.boolean(),
  dummy: z.boolean(),
  code: z.string().optional()
});

const AuthVerifyResponseSchema = z.object({
  user: AuthUserSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresAtISO: DateTimeSchema
});

const OkResponseSchema = z.object({
  ok: z.boolean()
});

export function registerAuthPaths(
  registry: OpenApiRegistry,
  paths: Record<string, Record<string, unknown>>
) {
  const errorSchema = registry.addSchema('AuthErrorResponse', ErrorResponseSchema);

  registry.addPath(paths, '/auth/email/start', 'post', {
    tags: ['auth'],
    requestBody: registry.requestBody(EmailStartSchema),
    responses: {
      200: {
        description: 'OK',
        content: {
          'application/json': {
            schema: registry.addSchema('AuthStartResponse', AuthStartResponseSchema)
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

  registry.addPath(paths, '/auth/email/verify', 'post', {
    tags: ['auth'],
    requestBody: registry.requestBody(EmailVerifySchema),
    responses: {
      200: {
        description: 'OK',
        content: {
          'application/json': {
            schema: registry.addSchema('AuthVerifyResponse', AuthVerifyResponseSchema)
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
      },
      429: {
        description: 'Too Many Requests',
        content: {
          'application/json': {
            schema: errorSchema
          }
        }
      }
    }
  });

  registry.addPath(paths, '/auth/signout', 'post', {
    tags: ['auth'],
    requestBody: registry.requestBody(SignoutSchema, false),
    responses: {
      200: {
        description: 'OK',
        content: {
          'application/json': {
            schema: registry.addSchema('AuthOkResponse', OkResponseSchema)
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

  registry.addPath(paths, '/auth/account', 'delete', {
    tags: ['auth'],
    responses: {
      200: {
        description: 'OK',
        content: {
          'application/json': {
            schema: registry.addSchema('AuthDeleteResponse', OkResponseSchema)
          }
        }
      },
      401: {
        description: 'Unauthorized',
        content: {
          'application/json': {
            schema: errorSchema
          }
        }
      }
    }
  });

  registry.addPath(paths, '/auth/apple', 'post', {
    tags: ['auth'],
    responses: {
      501: {
        description: 'Not Implemented',
        content: {
          'application/json': {
            schema: errorSchema
          }
        }
      }
    }
  });

  registry.addPath(paths, '/auth/google', 'post', {
    tags: ['auth'],
    responses: {
      501: {
        description: 'Not Implemented',
        content: {
          'application/json': {
            schema: errorSchema
          }
        }
      }
    }
  });
}
