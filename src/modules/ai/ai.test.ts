import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../app';
import { prisma } from '../../db/prisma';
import { getAuthContext, AuthContext } from '../../test/auth';
import type { AiProvider } from './service';

const run = process.env.DATABASE_URL ? describe : describe.skip;

run('ai api', () => {
  const email = 'ai-test@leanamp.local';
  let app: ReturnType<typeof buildApp>;
  let auth: AuthContext;

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.aiCallLog.deleteMany();
    await prisma.emailOtp.deleteMany({ where: { email } });
    await prisma.user.deleteMany({ where: { email } });

    const provider: AiProvider = {
      generateText: async () =>
        JSON.stringify({
          status: 'OK',
          overall: 'POS',
          bullets: [
            { k: 'CAL', s: 'P1', t: '[OK] calories on track' }
          ],
          actions: [],
          warnings: [],
          disclaimer: 'ESTIMATE'
        })
    };

    app = buildApp({
      ai: {
        provider,
        cache: new Map(),
        limits: {
          dailyTotal: 100,
          dailyText: 100,
          dailyImage: 10,
          dailyHeavy: 10
        }
      }
    });

    auth = await getAuthContext(app, email);
  });

  beforeEach(async () => {
    await prisma.aiCallLog.deleteMany();
  });

  afterAll(async () => {
    await prisma.aiCallLog.deleteMany();
    await prisma.emailOtp.deleteMany({ where: { email } });
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
    await prisma.$disconnect();
  });

  it('returns insights and replaces tokens', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/ai/insights',
      headers: auth.headers,
      payload: {
        calories: { intakeAvg: 2000, targetKcal: 2100, balanceAvg: -100 },
        macros: { proteinG: 120, fatG: 60, carbsG: 200, fiberG: 25 },
        water: { litersAvg: 2.2, adherence: 0.8 },
        movement: { stepsAvg: 8000, exerciseCount: 3, strengthTrend: 'up' },
        weight: { rateKgPerWeek: 0.2, volatility: 0.3 }
      }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.bullets[0].t).toContain('✅');
  });

  it('returns AI_BAD_OUTPUT for invalid json', async () => {
    const badProvider: AiProvider = {
      generateText: async () => 'not-json'
    };

    const badApp = buildApp({
      ai: {
        provider: badProvider,
        cache: new Map(),
        limits: {
          dailyTotal: 100,
          dailyText: 100,
          dailyImage: 10,
          dailyHeavy: 10
        }
      }
    });

    const badAuth = await getAuthContext(badApp, 'ai-bad@leanamp.local');

    const response = await badApp.inject({
      method: 'POST',
      url: '/ai/food/describe',
      headers: badAuth.headers,
      payload: { text: 'Chicken and rice' }
    });

    expect(response.statusCode).toBe(502);
    expect(response.json().error.code).toBe('AI_BAD_OUTPUT');

    await prisma.emailOtp.deleteMany({ where: { email: 'ai-bad@leanamp.local' } });
    await prisma.user.deleteMany({ where: { email: 'ai-bad@leanamp.local' } });
    await badApp.close();
  });

  it('enforces daily caps across restarts', async () => {
    const capProvider: AiProvider = {
      generateText: async () =>
        JSON.stringify({
          status: 'OK',
          mealName: 'Test Meal',
          parsed: 'Test meal',
          kcal: 500,
          protein: 30,
          fat: 15,
          carbs: 50,
          fiber: 5,
          confidence: 0.7,
          questions: [],
          disclaimer: 'ESTIMATE'
        })
    };

    const capApp = buildApp({
      ai: {
        provider: capProvider,
        cache: new Map(),
        limits: {
          dailyTotal: 1,
          dailyText: 1,
          dailyImage: 1,
          dailyHeavy: 1
        }
      }
    });

    const capAuth = await getAuthContext(capApp, 'ai-cap@leanamp.local');

    const first = await capApp.inject({
      method: 'POST',
      url: '/ai/food/describe',
      headers: capAuth.headers,
      payload: { text: 'Chicken and rice' }
    });

    expect(first.statusCode).toBe(200);

    await capApp.close();

    const capApp2 = buildApp({
      ai: {
        provider: capProvider,
        cache: new Map(),
        limits: {
          dailyTotal: 1,
          dailyText: 1,
          dailyImage: 1,
          dailyHeavy: 1
        }
      }
    });

    const capAuth2 = await getAuthContext(capApp2, 'ai-cap@leanamp.local');

    const second = await capApp2.inject({
      method: 'POST',
      url: '/ai/food/describe',
      headers: capAuth2.headers,
      payload: { text: 'Pasta with sauce' }
    });

    expect(second.statusCode).toBe(429);
    expect(second.json().error.code).toBe('AI_RATE_LIMIT');

    await prisma.emailOtp.deleteMany({ where: { email: 'ai-cap@leanamp.local' } });
    await prisma.user.deleteMany({ where: { email: 'ai-cap@leanamp.local' } });
    await capApp2.close();
  });
});
