import { z } from 'zod';

export const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const DateTimeSchema = z.string().datetime();
export const UUIDSchema = z.string().uuid();

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional()
  })
});
