import { z } from 'zod';
import {
  CompletionCreateSchema,
  CompletionDeleteParamsSchema,
  CompletionDeleteQuerySchema,
  CompletionQuerySchema,
  DayPlanCreateSchema,
  DayPlanUpdateSchema,
  ExerciseCreateSchema,
  ExerciseUpdateSchema,
  ExtraActivityCreateSchema,
  ExtraActivityQuerySchema,
  ExtraIntensitySchema,
  IdParamSchema,
  TopSetCreateSchema,
  TopSetQuerySchema
} from '../../modules/training/schemas';
import type { OpenApiRegistry } from '../registry';
import { DateTimeSchema, ErrorResponseSchema, UUIDSchema } from './shared';

const PlannedExerciseSchema = z.object({
  id: UUIDSchema,
  userId: UUIDSchema,
  dayId: UUIDSchema,
  createdAt: DateTimeSchema,
  updatedAt: DateTimeSchema,
  name: z.string(),
  workingWeight: z.number(),
  targetRepsMin: z.number().int(),
  targetRepsMax: z.number().int(),
  notes: z.string().nullable(),
  pinned: z.boolean()
});

const DayPlanSchema = z.object({
  id: UUIDSchema,
  userId: UUIDSchema,
  createdAt: DateTimeSchema,
  updatedAt: DateTimeSchema,
  title: z.string(),
  emoji: z.string()
});

const DayPlanWithExercisesSchema = DayPlanSchema.extend({
  exercises: z.array(PlannedExerciseSchema)
});

const TopSetEntrySchema = z.object({
  id: UUIDSchema,
  userId: UUIDSchema,
  createdAt: DateTimeSchema,
  updatedAt: DateTimeSchema,
  dateISO: DateTimeSchema,
  dayId: UUIDSchema,
  exerciseId: UUIDSchema,
  weight: z.number(),
  reps: z.number().int(),
  sets: z.number().int(),
  workSets: z.array(
    z.object({
      weight: z.number(),
      reps: z.number().int(),
      id: z.string().optional()
    })
  )
});

const CompletionLogSchema = z.object({
  id: UUIDSchema,
  userId: UUIDSchema,
  createdAt: DateTimeSchema,
  updatedAt: DateTimeSchema,
  dateISO: DateTimeSchema,
  dayId: UUIDSchema
});

const ExtraActivitySchema = z.object({
  id: UUIDSchema,
  userId: UUIDSchema,
  createdAt: DateTimeSchema,
  updatedAt: DateTimeSchema,
  dateISO: DateTimeSchema,
  type: z.string(),
  minutes: z.number().int(),
  intensity: ExtraIntensitySchema,
  kcalEst: z.number(),
  notes: z.string().nullable()
});

export function registerTrainingPaths(
  registry: OpenApiRegistry,
  paths: Record<string, Record<string, unknown>>
) {
  const errorSchema = registry.addSchema('ErrorResponse', ErrorResponseSchema);
  const dayPlanSchema = registry.addSchema('DayPlan', DayPlanSchema);
  const exerciseSchema = registry.addSchema('PlannedExercise', PlannedExerciseSchema);
  const topSetSchema = registry.addSchema('TopSetEntry', TopSetEntrySchema);
  const completionSchema = registry.addSchema('CompletionLog', CompletionLogSchema);
  const extraActivitySchema = registry.addSchema('ExtraActivity', ExtraActivitySchema);

  registry.addPath(paths, '/training/plan', 'get', {
    tags: ['training'],
    responses: {
      200: {
        description: 'OK',
        content: {
          'application/json': {
            schema: registry.schema(z.array(DayPlanWithExercisesSchema))
          }
        }
      }
    }
  });

  registry.addPath(paths, '/training/plan/day', 'post', {
    tags: ['training'],
    requestBody: registry.requestBody(DayPlanCreateSchema),
    responses: {
      200: {
        description: 'OK',
        content: {
          'application/json': {
            schema: dayPlanSchema
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

  registry.addPath(paths, '/training/plan/day/{id}', 'patch', {
    tags: ['training'],
    parameters: registry.parametersFromSchema(IdParamSchema, 'path'),
    requestBody: registry.requestBody(DayPlanUpdateSchema),
    responses: {
      200: {
        description: 'OK',
        content: {
          'application/json': {
            schema: dayPlanSchema
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

  registry.addPath(paths, '/training/plan/day/{id}', 'delete', {
    tags: ['training'],
    parameters: registry.parametersFromSchema(IdParamSchema, 'path'),
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

  registry.addPath(paths, '/training/plan/exercise', 'post', {
    tags: ['training'],
    requestBody: registry.requestBody(ExerciseCreateSchema),
    responses: {
      200: {
        description: 'OK',
        content: {
          'application/json': {
            schema: exerciseSchema
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

  registry.addPath(paths, '/training/plan/exercise/{id}', 'patch', {
    tags: ['training'],
    parameters: registry.parametersFromSchema(IdParamSchema, 'path'),
    requestBody: registry.requestBody(ExerciseUpdateSchema),
    responses: {
      200: {
        description: 'OK',
        content: {
          'application/json': {
            schema: exerciseSchema
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

  registry.addPath(paths, '/training/plan/exercise/{id}', 'delete', {
    tags: ['training'],
    parameters: registry.parametersFromSchema(IdParamSchema, 'path'),
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

  registry.addPath(paths, '/training/topsets', 'post', {
    tags: ['training'],
    requestBody: registry.requestBody(TopSetCreateSchema),
    responses: {
      200: {
        description: 'OK',
        content: {
          'application/json': {
            schema: topSetSchema
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

  registry.addPath(paths, '/training/topsets', 'get', {
    tags: ['training'],
    parameters: registry.parametersFromSchema(TopSetQuerySchema, 'query'),
    responses: {
      200: {
        description: 'OK',
        content: {
          'application/json': {
            schema: registry.schema(z.array(TopSetEntrySchema))
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

  registry.addPath(paths, '/training/completions', 'post', {
    tags: ['training'],
    requestBody: registry.requestBody(CompletionCreateSchema),
    responses: {
      200: {
        description: 'OK',
        content: {
          'application/json': {
            schema: completionSchema
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

  registry.addPath(paths, '/training/completions', 'get', {
    tags: ['training'],
    parameters: registry.parametersFromSchema(CompletionQuerySchema, 'query'),
    responses: {
      200: {
        description: 'OK',
        content: {
          'application/json': {
            schema: registry.schema(z.array(CompletionLogSchema))
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

  registry.addPath(paths, '/training/completions/{dateISO}', 'delete', {
    tags: ['training'],
    parameters: [
      ...registry.parametersFromSchema(CompletionDeleteParamsSchema, 'path'),
      ...registry.parametersFromSchema(CompletionDeleteQuerySchema, 'query')
    ],
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

  registry.addPath(paths, '/training/extra-activity', 'post', {
    tags: ['training'],
    requestBody: registry.requestBody(ExtraActivityCreateSchema),
    responses: {
      200: {
        description: 'OK',
        content: {
          'application/json': {
            schema: extraActivitySchema
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

  registry.addPath(paths, '/training/extra-activity', 'get', {
    tags: ['training'],
    parameters: registry.parametersFromSchema(ExtraActivityQuerySchema, 'query'),
    responses: {
      200: {
        description: 'OK',
        content: {
          'application/json': {
            schema: registry.schema(z.array(ExtraActivitySchema))
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

  registry.addPath(paths, '/training/extra-activity/{id}', 'delete', {
    tags: ['training'],
    parameters: registry.parametersFromSchema(IdParamSchema, 'path'),
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
