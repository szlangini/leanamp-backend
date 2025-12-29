import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

type JsonSchema = Record<string, unknown>;

type OpenApiRegistry = {
  addSchema: (name: string, schema: z.ZodTypeAny) => { $ref: string };
  schema: (schema: z.ZodTypeAny) => JsonSchema;
  getSchemas: () => Record<string, JsonSchema>;
  requestBody: (schema: z.ZodTypeAny, required?: boolean) => Record<string, unknown>;
  response: (schema: z.ZodTypeAny, description?: string) => Record<string, unknown>;
  parametersFromSchema: (
    schema: z.ZodTypeAny,
    location: 'query' | 'path'
  ) => Record<string, unknown>[];
  addPath: (
    paths: Record<string, Record<string, unknown>>,
    path: string,
    method: string,
    operation: Record<string, unknown>
  ) => void;
};

function stripJsonSchema(schema: JsonSchema) {
  const copy = { ...schema } as Record<string, unknown>;
  delete copy.$schema;
  delete copy.definitions;
  return copy;
}

function unwrapSchema(schema: z.ZodTypeAny): z.ZodTypeAny {
  if (schema instanceof z.ZodEffects) {
    return unwrapSchema(schema._def.schema);
  }
  if (schema instanceof z.ZodDefault) {
    return unwrapSchema(schema._def.innerType);
  }
  if (schema instanceof z.ZodOptional) {
    return unwrapSchema(schema._def.innerType);
  }
  if (schema instanceof z.ZodNullable) {
    return unwrapSchema(schema._def.innerType);
  }
  return schema;
}

function unwrapObjectSchema(schema: z.ZodTypeAny): z.ZodObject<Record<string, z.ZodTypeAny>> | null {
  const unwrapped = unwrapSchema(schema);
  return unwrapped instanceof z.ZodObject ? unwrapped : null;
}

export function createRegistry(): OpenApiRegistry {
  const schemas: Record<string, JsonSchema> = {};

  const toSchema = (schema: z.ZodTypeAny) => {
    const json = zodToJsonSchema(schema, {
      target: 'openApi3',
      $refStrategy: 'none'
    }) as JsonSchema;

    return stripJsonSchema(json);
  };

  const addSchema = (name: string, schema: z.ZodTypeAny) => {
    schemas[name] = toSchema(schema);
    return { $ref: `#/components/schemas/${name}` };
  };

  const parametersFromSchema = (schema: z.ZodTypeAny, location: 'query' | 'path') => {
    const objectSchema = unwrapObjectSchema(schema);
    if (!objectSchema) {
      return [];
    }

    const shape = objectSchema.shape;

    return Object.entries(shape).map(([key, value]) => {
      const required = location === 'path' ? true : !value.isOptional();
      return {
        name: key,
        in: location,
        required,
        schema: toSchema(value)
      };
    });
  };

  const requestBody = (schema: z.ZodTypeAny, required = true) => ({
    required,
    content: {
      'application/json': {
        schema: toSchema(schema)
      }
    }
  });

  const response = (schema: z.ZodTypeAny, description = 'OK') => ({
    description,
    content: {
      'application/json': {
        schema: toSchema(schema)
      }
    }
  });

  const addPath = (
    paths: Record<string, Record<string, unknown>>,
    path: string,
    method: string,
    operation: Record<string, unknown>
  ) => {
    if (!paths[path]) {
      paths[path] = {};
    }
    paths[path][method] = operation;
  };

  return {
    addSchema,
    schema: toSchema,
    getSchemas: () => schemas,
    requestBody,
    response,
    parametersFromSchema,
    addPath
  };
}

export type { OpenApiRegistry };
