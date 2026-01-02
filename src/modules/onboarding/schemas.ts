import { z } from 'zod';

export const OnboardingUpdateSchema = z
  .object({
    hasOnboarded: z.boolean(),
    currentStep: z.number().int().min(1).max(4).optional()
  })
  .superRefine((data, ctx) => {
    if (!data.hasOnboarded && data.currentStep === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'currentStep is required when hasOnboarded is false',
        path: ['currentStep']
      });
    }
  });

export type OnboardingUpdateInput = z.infer<typeof OnboardingUpdateSchema>;
