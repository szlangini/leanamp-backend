import dotenv from 'dotenv';
import { z } from 'zod';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const envSchema = z.object({
  PORT: z.preprocess(
    (value) => (value === undefined ? undefined : Number(value)),
    z.number().int().positive().default(3001)
  ),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DEV_LOG: z.preprocess(
    (value) => {
      if (value === undefined) return undefined;
      if (typeof value === 'string') {
        const normalized = value.toLowerCase();
        if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
        if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
      }
      return value;
    },
    z.boolean().default(true)
  ),
  OPENAPI_ENABLED: z.preprocess(
    (value) => {
      if (value === undefined) return undefined;
      if (typeof value === 'string') {
        const normalized = value.toLowerCase();
        if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
        if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
      }
      return value;
    },
    z.boolean().default(process.env.NODE_ENV === 'production' ? false : true)
  )
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
    .join(', ');
  throw new Error(`Invalid environment variables: ${details}`);
}

export const env = parsed.data;
