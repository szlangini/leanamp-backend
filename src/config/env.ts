import dotenv from 'dotenv';
import { z } from 'zod';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const numberSchema = (defaultValue: number) =>
  z.preprocess(
    (value) => (value === undefined ? undefined : Number(value)),
    z.number().int().positive().default(defaultValue)
  );

const booleanSchema = (defaultValue: boolean) =>
  z.preprocess(
    (value) => {
      if (value === undefined) return undefined;
      if (typeof value === 'string') {
        const normalized = value.toLowerCase();
        if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
        if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
      }
      return value;
    },
    z.boolean().default(defaultValue)
  );

const envSchema = z.object({
  PORT: numberSchema(3001),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DEV_LOG: booleanSchema(true),
  OPENAPI_ENABLED: booleanSchema(process.env.NODE_ENV === 'production' ? false : true),
  AUTH_MODE: z.enum(['dev', 'jwt']).default('dev'),
  JWT_ACCESS_SECRET: z.string().min(1).default('change_me'),
  JWT_REFRESH_SECRET: z.string().min(1).default('change_me'),
  JWT_ACCESS_TTL_SECONDS: numberSchema(900),
  JWT_REFRESH_TTL_SECONDS: numberSchema(2592000),
  OTP_TTL_SECONDS: numberSchema(600),
  DEV_OTP_ECHO: booleanSchema(true),
  AUTH_DEV_DEFAULT_EMAIL: z.string().min(1).default('a@a.de'),
  OFF_BASE_URL: z.string().min(1).default('https://world.openfoodfacts.org'),
  OFF_USER_AGENT: z
    .string()
    .min(1)
    .default('leanamp-backend/0.0.0 (contact: you@example.com)'),
  FOOD_CATALOG_ENABLE_OFF: booleanSchema(true),
  FOOD_CATALOG_INTERNAL_ONLY: booleanSchema(false),
  USDA_API_KEY: z.string().optional().default(''),
  FOOD_CATALOG_ENABLE_USDA: booleanSchema(false),
  USDA_BASE_URL: z.string().min(1).default('https://api.nal.usda.gov/fdc/v1')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
    .join(', ');
  throw new Error(`Invalid environment variables: ${details}`);
}

if (parsed.data.FOOD_CATALOG_ENABLE_USDA && !parsed.data.USDA_API_KEY) {
  throw new Error('USDA_API_KEY is required when FOOD_CATALOG_ENABLE_USDA=true');
}

export const env = parsed.data;
