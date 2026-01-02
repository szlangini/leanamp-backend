import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../app';
import { prisma } from '../../db/prisma';
import { getAuthContext, AuthContext } from '../../test/auth';

const run = process.env.DATABASE_URL ? describe : describe.skip;

run('onboarding api', () => {
  const email = 'onboarding-test@leanamp.local';
  let app: ReturnType<typeof buildApp>;
  let auth: AuthContext;

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.emailOtp.deleteMany({ where: { email } });
    await prisma.user.deleteMany({ where: { email } });
    app = buildApp();
    auth = await getAuthContext(app, email);
  });

  beforeEach(async () => {
    await prisma.profile.deleteMany({ where: { userId: auth.userId } });
  });

  afterAll(async () => {
    await prisma.profile.deleteMany({ where: { userId: auth.userId } });
    await prisma.user.deleteMany({ where: { id: auth.userId } });
    await prisma.emailOtp.deleteMany({ where: { email } });
    await app.close();
    await prisma.$disconnect();
  });

  it('returns default onboarding state', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/onboarding',
      headers: auth.headers
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.hasOnboarded).toBe(false);
    expect(body.completedAt).toBeUndefined();
  });

  it('requires currentStep when not onboarded', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/onboarding',
      headers: auth.headers,
      payload: {
        hasOnboarded: false
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('bad_request');
  });

  it('updates onboarding state and sets completion date', async () => {
    const stepResponse = await app.inject({
      method: 'POST',
      url: '/onboarding',
      headers: auth.headers,
      payload: {
        hasOnboarded: false,
        currentStep: 2
      }
    });

    expect(stepResponse.statusCode).toBe(200);
    const stepBody = stepResponse.json();
    expect(stepBody.state.hasOnboarded).toBe(false);
    expect(stepBody.state.currentStep).toBe(2);

    const doneResponse = await app.inject({
      method: 'POST',
      url: '/onboarding',
      headers: auth.headers,
      payload: {
        hasOnboarded: true,
        currentStep: 4
      }
    });

    expect(doneResponse.statusCode).toBe(200);
    const doneBody = doneResponse.json();
    expect(doneBody.state.hasOnboarded).toBe(true);
    expect(doneBody.state.currentStep).toBe(4);
    expect(typeof doneBody.state.completedAt).toBe('string');

    const getResponse = await app.inject({
      method: 'GET',
      url: '/onboarding',
      headers: auth.headers
    });

    expect(getResponse.statusCode).toBe(200);
    const getBody = getResponse.json();
    expect(getBody.hasOnboarded).toBe(true);
    expect(getBody.completedAt).toBe(doneBody.state.completedAt);
  });
});
