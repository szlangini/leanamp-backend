import { z } from 'zod';

export const EmailStartSchema = z.object({
  email: z.string().email()
});

export const EmailVerifySchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
  deviceName: z.string().optional()
});

export const SignoutSchema = z.object({
  refreshToken: z.string().optional()
});

export type EmailStartInput = z.infer<typeof EmailStartSchema>;
export type EmailVerifyInput = z.infer<typeof EmailVerifySchema>;
export type SignoutInput = z.infer<typeof SignoutSchema>;
