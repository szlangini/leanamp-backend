import type { Profile, Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { getProfile } from '../profile/service';
import type { OnboardingUpdateInput } from './schemas';

type OnboardingState = {
  hasOnboarded: boolean;
  currentStep?: number;
  completedAt?: string;
  updatedAt?: string;
};

async function ensureUser(userId: string) {
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId }
  });
}

async function ensureProfile(userId: string): Promise<Profile> {
  await ensureUser(userId);
  let profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) {
    await getProfile(userId);
    profile = await prisma.profile.findUnique({ where: { userId } });
  }
  if (!profile) {
    throw new Error('Profile not found');
  }
  return profile;
}

function toState(profile: Profile): OnboardingState {
  return {
    hasOnboarded: profile.hasOnboarded,
    ...(profile.onboardingStep ? { currentStep: profile.onboardingStep } : {}),
    ...(profile.onboardingCompletedAt
      ? { completedAt: profile.onboardingCompletedAt.toISOString() }
      : {}),
    updatedAt: profile.updatedAt.toISOString()
  };
}

export async function getOnboardingState(userId: string): Promise<OnboardingState> {
  const profile = await ensureProfile(userId);
  return toState(profile);
}

export async function upsertOnboardingState(
  userId: string,
  input: OnboardingUpdateInput
): Promise<OnboardingState> {
  const profile = await ensureProfile(userId);
  const data: Prisma.ProfileUpdateInput = {
    hasOnboarded: input.hasOnboarded
  };

  if (input.hasOnboarded) {
    if (input.currentStep !== undefined) {
      data.onboardingStep = input.currentStep;
    }
    if (!profile.onboardingCompletedAt) {
      data.onboardingCompletedAt = new Date();
    }
  } else {
    data.onboardingStep = input.currentStep ?? null;
    data.onboardingCompletedAt = null;
  }

  const updated = await prisma.profile.update({
    where: { userId },
    data
  });

  return toState(updated);
}
