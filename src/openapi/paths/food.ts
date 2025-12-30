import { z } from 'zod';
import {
  FoodEntriesQuerySchema,
  FoodEntryCreateSchema,
  FoodEntryTypeSchema,
  FoodEntryUpdateSchema,
  FoodTemplateCreateSchema,
  IdParamSchema,
  MealGroupCreateSchema,
  MealGroupUpdateSchema
} from '../../modules/food/schemas';
import {
  FoodCatalogBarcodeParamSchema,
  FoodCatalogBarcodeQuerySchema,
  FoodCatalogItemSchema,
  FoodCatalogSearchQuerySchema
} from '../../modules/foodCatalog/schemas';
import type { OpenApiRegistry } from '../registry';
import { DateTimeSchema, ErrorResponseSchema, UUIDSchema } from './shared';

const FoodTemplateSchema = z.object({
  id: UUIDSchema,
  userId: UUIDSchema,
  createdAt: DateTimeSchema,
  updatedAt: DateTimeSchema,
  name: z.string(),
  kcal: z.number().int(),
  protein: z.number(),
  fat: z.number(),
  carbs: z.number(),
  fiber: z.number()
});

const MealGroupSchema = z.object({
  id: UUIDSchema,
  userId: UUIDSchema,
  createdAt: DateTimeSchema,
  updatedAt: DateTimeSchema,
  dateISO: DateTimeSchema,
  title: z.string(),
  isExpanded: z.boolean()
});

const FoodEntrySchema = z.object({
  id: UUIDSchema,
  userId: UUIDSchema,
  createdAt: DateTimeSchema,
  updatedAt: DateTimeSchema,
  dateISO: DateTimeSchema,
  name: z.string(),
  kcal: z.number().int(),
  protein: z.number(),
  fat: z.number(),
  carbs: z.number(),
  fiber: z.number(),
  multiplier: z.number(),
  type: FoodEntryTypeSchema,
  groupId: UUIDSchema.nullable(),
  note: z.string().nullable()
});

export function registerFoodPaths(
  registry: OpenApiRegistry,
  paths: Record<string, Record<string, unknown>>
) {
  const errorSchema = registry.addSchema('ErrorResponse', ErrorResponseSchema);
  const templateSchema = registry.addSchema('FoodTemplate', FoodTemplateSchema);
  const mealGroupSchema = registry.addSchema('MealGroup', MealGroupSchema);
  const foodEntrySchema = registry.addSchema('FoodEntry', FoodEntrySchema);
  const catalogResponseSchema = registry.schema(
    z.object({ items: z.array(FoodCatalogItemSchema) })
  );

  registry.addPath(paths, '/food/templates', 'get', {
    tags: ['food'],
    responses: {
      200: {
        description: 'OK',
        content: {
          'application/json': {
            schema: registry.schema(z.array(FoodTemplateSchema))
          }
        }
      }
    }
  });

  registry.addPath(paths, '/food/templates', 'post', {
    tags: ['food'],
    requestBody: registry.requestBody(FoodTemplateCreateSchema),
    responses: {
      200: {
        description: 'OK',
        content: {
          'application/json': {
            schema: templateSchema
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

  registry.addPath(paths, '/food/templates/{id}', 'delete', {
    tags: ['food'],
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

  registry.addPath(paths, '/food/meal-groups', 'post', {
    tags: ['food'],
    requestBody: registry.requestBody(MealGroupCreateSchema),
    responses: {
      200: {
        description: 'OK',
        content: {
          'application/json': {
            schema: mealGroupSchema
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

  registry.addPath(paths, '/food/meal-groups/{id}', 'patch', {
    tags: ['food'],
    parameters: registry.parametersFromSchema(IdParamSchema, 'path'),
    requestBody: registry.requestBody(MealGroupUpdateSchema),
    responses: {
      200: {
        description: 'OK',
        content: {
          'application/json': {
            schema: mealGroupSchema
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

  registry.addPath(paths, '/food/entries', 'get', {
    tags: ['food'],
    parameters: registry.parametersFromSchema(FoodEntriesQuerySchema, 'query'),
    responses: {
      200: {
        description: 'OK',
        content: {
          'application/json': {
            schema: registry.schema(z.array(FoodEntrySchema))
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

  registry.addPath(paths, '/food/entries', 'post', {
    tags: ['food'],
    requestBody: registry.requestBody(FoodEntryCreateSchema),
    responses: {
      200: {
        description: 'OK',
        content: {
          'application/json': {
            schema: foodEntrySchema
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

  registry.addPath(paths, '/food/entries/{id}', 'patch', {
    tags: ['food'],
    parameters: registry.parametersFromSchema(IdParamSchema, 'path'),
    requestBody: registry.requestBody(FoodEntryUpdateSchema),
    responses: {
      200: {
        description: 'OK',
        content: {
          'application/json': {
            schema: foodEntrySchema
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

  registry.addPath(paths, '/food/entries/{id}', 'delete', {
    tags: ['food'],
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

  registry.addPath(paths, '/food/catalog/search', 'get', {
    tags: ['food'],
    parameters: registry.parametersFromSchema(FoodCatalogSearchQuerySchema, 'query'),
    responses: {
      200: {
        description: 'OK',
        content: {
          'application/json': {
            schema: catalogResponseSchema
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

  registry.addPath(paths, '/food/catalog/barcode/{ean}', 'get', {
    tags: ['food'],
    parameters: [
      ...registry.parametersFromSchema(FoodCatalogBarcodeParamSchema, 'path'),
      ...registry.parametersFromSchema(FoodCatalogBarcodeQuerySchema, 'query')
    ],
    responses: {
      200: {
        description: 'OK',
        content: {
          'application/json': {
            schema: catalogResponseSchema
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
}
