import crypto from 'crypto';
import { prisma } from '../../db/prisma';
import { env } from '../../config/env';
import { hashToken, randomNumericCode, timingSafeEqualHash } from '../../auth/hashing';
import { signAccessToken, signRefreshToken } from '../../auth/jwt';

const MAX_OTP_ATTEMPTS = 5;

function hashOtp(email: string, code: string) {
  return hashToken(`${email}:${code}`);
}

export async function createEmailOtp(email: string) {
  const code = randomNumericCode(6);
  const expiresAt = new Date(Date.now() + env.OTP_TTL_SECONDS * 1000);

  await prisma.emailOtp.create({
    data: {
      email,
      codeHash: hashOtp(email, code),
      expiresAt
    }
  });

  return { code, expiresAt };
}

type VerifyResult =
  | {
      ok: true;
      user: { id: string; email: string | null; displayName: string | null };
      accessToken: string;
      refreshToken: string;
      expiresAt: Date;
    }
  | { ok: false; reason: 'missing' | 'invalid' | 'locked' };

export async function verifyEmailOtp(
  email: string,
  code: string,
  deviceName?: string
): Promise<VerifyResult> {
  const now = new Date();
  const otp = await prisma.emailOtp.findFirst({
    where: {
      email,
      consumedAt: null,
      expiresAt: { gt: now }
    },
    orderBy: { createdAt: 'desc' }
  });

  if (!otp) {
    return { ok: false, reason: 'missing' };
  }

  const updated = await prisma.emailOtp.update({
    where: { id: otp.id },
    data: { attempts: { increment: 1 } }
  });

  if (updated.attempts > MAX_OTP_ATTEMPTS) {
    return { ok: false, reason: 'locked' };
  }

  const matches = timingSafeEqualHash(updated.codeHash, hashOtp(email, code));

  if (!matches) {
    return { ok: false, reason: 'invalid' };
  }

  await prisma.emailOtp.update({
    where: { id: otp.id },
    data: { consumedAt: now }
  });

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email }
  });

  const sessionId = crypto.randomUUID();
  const refreshToken = signRefreshToken(sessionId, user.id);
  const refreshHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + env.JWT_REFRESH_TTL_SECONDS * 1000);

  await prisma.session.create({
    data: {
      id: sessionId,
      userId: user.id,
      refreshHash,
      expiresAt,
      deviceName: deviceName ?? null
    }
  });

  const accessToken = signAccessToken(user.id);

  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email ?? null,
      displayName: user.displayName ?? null
    },
    accessToken,
    refreshToken,
    expiresAt
  };
}

export async function revokeSession(refreshToken: string) {
  const refreshHash = hashToken(refreshToken);
  await prisma.session.updateMany({
    where: { refreshHash, revokedAt: null },
    data: { revokedAt: new Date() }
  });
}

export async function deleteAccount(userId: string) {
  try {
    await prisma.user.delete({ where: { id: userId } });
    return true;
  } catch {
    return false;
  }
}
