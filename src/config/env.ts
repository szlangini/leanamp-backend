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
  TRUST_PROXY: booleanSchema(true),
  CORS_ENABLED: booleanSchema(true),
  CORS_ORIGINS: z
    .string()
    .min(1)
    .default('http://localhost:19006,http://localhost:3000'),
  RATE_LIMIT_GLOBAL_PER_MIN: numberSchema(120),
  RATE_LIMIT_AUTH_START_PER_MIN: numberSchema(5),
  RATE_LIMIT_AUTH_VERIFY_PER_MIN: numberSchema(10),
  RATE_LIMIT_FOOD_SEARCH_PER_MIN: numberSchema(30),
  RATE_LIMIT_FOOD_BARCODE_PER_MIN: numberSchema(60),
  RATE_LIMIT_AI_PER_MIN: numberSchema(20),
  RATE_LIMIT_AI_HEAVY_PER_MIN: numberSchema(5),
  PROVIDER_OFF_RPS: numberSchema(2),
  PROVIDER_USDA_RPS: numberSchema(2),
  PROVIDER_TIMEOUT_MS: numberSchema(6000),
  PROVIDER_CIRCUIT_FAILS: numberSchema(5),
  PROVIDER_CIRCUIT_COOLDOWN_MS: numberSchema(60000),
  FOOD_DBITEM_TTL_HOURS: numberSchema(168),
  FOOD_CATALOG_CACHE_ONLY_ON_PROVIDER_DOWN: booleanSchema(true),
  AI_ENABLED: booleanSchema(false),
  GEMINI_API_KEY: z.string().optional().default(''),
  GEMINI_BASE_URL: z.string().min(1).default('https://generativelanguage.googleapis.com'),
  GEMINI_MODEL_TEXT: z.string().min(1).default('gemini-2.5-flash-lite'),
  GEMINI_MODEL_VISION: z.string().min(1).default('gemini-2.5-flash'),
  AI_TIMEOUT_MS: numberSchema(8000),
  AI_MAX_OUTPUT_TOKENS_TEXT: numberSchema(350),
  AI_MAX_OUTPUT_TOKENS_VISION: numberSchema(450),
  AI_DAILY_CALLS_MAX: numberSchema(50),
  AI_DAILY_TEXT_CALLS_MAX: numberSchema(45),
  AI_DAILY_IMAGE_CALLS_MAX: numberSchema(5),
  AI_CACHE_TTL_HOURS: numberSchema(24),
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

if (parsed.data.AI_ENABLED && !parsed.data.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is required when AI_ENABLED=true');
}

export const env = parsed.data;
