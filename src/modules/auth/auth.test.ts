import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app';
import { prisma } from '../../db/prisma';
import { hashToken } from '../../auth/hashing';

const run = process.env.DATABASE_URL ? describe : describe.skip;

run('auth api', () => {
  const email = 'auth-test@leanamp.local';
  const lockEmail = 'auth-lock@leanamp.local';
  let app: ReturnType<typeof buildApp>;

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.emailOtp.deleteMany({ where: { email } });
    await prisma.emailOtp.deleteMany({ where: { email: lockEmail } });
    await prisma.user.deleteMany({ where: { email } });
    await prisma.user.deleteMany({ where: { email: lockEmail } });
    app = buildApp();
  });

  afterAll(async () => {
    await prisma.emailOtp.deleteMany({ where: { email } });
    await prisma.emailOtp.deleteMany({ where: { email: lockEmail } });
    await prisma.user.deleteMany({ where: { email } });
    await prisma.user.deleteMany({ where: { email: lockEmail } });
    await app.close();
    await prisma.$disconnect();
  });

  it('issues tokens and allows access with jwt', async () => {
    const startResponse = await app.inject({
      method: 'POST',
      url: '/auth/email/start',
      payload: { email }
    });

    expect(startResponse.statusCode).toBe(200);
    const startBody = startResponse.json() as { code?: string };
    expect(startBody.code).toBeTruthy();

    const verifyResponse = await app.inject({
      method: 'POST',
      url: '/auth/email/verify',
      payload: { email, code: startBody.code }
    });

    expect(verifyResponse.statusCode).toBe(200);
    const verifyBody = verifyResponse.json() as {
      accessToken: string;
      refreshToken: string;
      user: { id: string; email: string };
    };

    const profileResponse = await app.inject({
      method: 'GET',
      url: '/profile',
      headers: {
        authorization: `Bearer ${verifyBody.accessToken}`
      }
    });

    expect(profileResponse.statusCode).toBe(200);

    const signoutResponse = await app.inject({
      method: 'POST',
      url: '/auth/signout',
      payload: { refreshToken: verifyBody.refreshToken }
    });

    expect(signoutResponse.statusCode).toBe(200);

    const refreshHash = hashToken(verifyBody.refreshToken);
    const session = await prisma.session.findFirst({ where: { refreshHash } });
    expect(session?.revokedAt).not.toBeNull();
  });

  it('locks otp after too many attempts', async () => {
    const startResponse = await app.inject({
      method: 'POST',
      url: '/auth/email/start',
      payload: { email: lockEmail }
    });

    expect(startResponse.statusCode).toBe(200);

    for (let i = 0; i < 5; i += 1) {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/email/verify',
        payload: { email: lockEmail, code: '000000' }
      });

      expect(response.statusCode).toBe(400);
    }

    const lockedResponse = await app.inject({
      method: 'POST',
      url: '/auth/email/verify',
      payload: { email: lockEmail, code: '000000' }
    });

    expect(lockedResponse.statusCode).toBe(429);
  });
});
