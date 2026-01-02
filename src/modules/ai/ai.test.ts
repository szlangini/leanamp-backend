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

  it('returns low-data fallback for insights', async () => {
    const provider: AiProvider = {
      generateText: async () => {
        throw new Error('should not be called');
      }
    };

    const lowApp = buildApp({
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

    const lowAuth = await getAuthContext(lowApp, 'ai-low@leanamp.local');

    const response = await lowApp.inject({
      method: 'POST',
      url: '/ai/insights',
      headers: lowAuth.headers,
      payload: {
        calories: { intakeAvg: 0, targetKcal: 2400, balanceAvg: 0 },
        macros: { proteinG: 0, fatG: 0, carbsG: 0, fiberG: 0 },
        water: { litersAvg: 0, adherence: 0 },
        movement: { stepsAvg: 0, exerciseCount: 0, strengthTrend: 'flat' },
        weight: { rateKgPerWeek: 0, volatility: 0.1 }
      }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.overall).toBe('NEU');
    expect(body.warnings[0]).toMatch(/not enough data/i);

    await prisma.emailOtp.deleteMany({ where: { email: 'ai-low@leanamp.local' } });
    await prisma.user.deleteMany({ where: { email: 'ai-low@leanamp.local' } });
    await lowApp.close();
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

  it('accepts activity description payloads', async () => {
    const provider: AiProvider = {
      generateText: async () =>
        JSON.stringify({
          status: 'OK',
          kcal: 300,
          suggestedName: '',
          confidence: 0.6,
          notes: 'estimated',
          disclaimer: 'ESTIMATE'
        })
    };

    const activityApp = buildApp({
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

    const activityAuth = await getAuthContext(activityApp, 'ai-activity@leanamp.local');

    const response = await activityApp.inject({
      method: 'POST',
      url: '/ai/activity/estimate',
      headers: activityAuth.headers,
      payload: {
        description: '30 min easy bike ride'
      }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(Number.isInteger(body.kcal)).toBe(true);
    expect(body.suggestedName).toBeTruthy();
    expect(typeof body.confidence).toBe('number');

    await prisma.emailOtp.deleteMany({ where: { email: 'ai-activity@leanamp.local' } });
    await prisma.user.deleteMany({ where: { email: 'ai-activity@leanamp.local' } });
    await activityApp.close();
  });

  it('returns meal shape for food describe with fallback', async () => {
    const provider: AiProvider = {
      generateText: async () =>
        JSON.stringify({
          status: 'OK',
          mealName: '',
          parsed: '',
          kcal: 250.4,
          protein: 20.12,
          fat: 5.55,
          carbs: 30.9,
          fiber: null,
          confidence: 0.6,
          questions: [],
          disclaimer: 'ESTIMATE'
        })
    };

    const foodApp = buildApp({
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

    const authContext = await getAuthContext(foodApp, 'ai-food@leanamp.local');

    const response = await foodApp.inject({
      method: 'POST',
      url: '/ai/food/describe',
      headers: authContext.headers,
      payload: { text: 'chicken breast and rice' }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.mealName).toBeTruthy();
    expect(typeof body.parsed).toBe('string');
    expect(Number.isInteger(body.kcal)).toBe(true);
    expect(typeof body.protein).toBe('number');
    expect(typeof body.fat).toBe('number');
    expect(typeof body.carbs).toBe('number');
    expect(body.fiber === null || typeof body.fiber === 'number').toBe(true);
    expect(Array.isArray(body.questions)).toBe(true);

    await prisma.emailOtp.deleteMany({ where: { email: 'ai-food@leanamp.local' } });
    await prisma.user.deleteMany({ where: { email: 'ai-food@leanamp.local' } });
    await foodApp.close();
  });

  it('returns meal shape for voice-to-meal', async () => {
    const provider: AiProvider = {
      generateText: async () =>
        JSON.stringify({
          status: 'OK',
          mealName: 'Overnight Oats',
          parsed: 'Overnight oats with berries',
          kcal: 420,
          protein: 18,
          fat: 12,
          carbs: 60,
          fiber: 8,
          confidence: 0.7,
          questions: [],
          disclaimer: 'ESTIMATE'
        })
    };

    const voiceApp = buildApp({
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

    const authContext = await getAuthContext(voiceApp, 'ai-voice@leanamp.local');

    const response = await voiceApp.inject({
      method: 'POST',
      url: '/ai/voice-to-meal',
      headers: authContext.headers,
      payload: { text: 'overnight oats with berries' }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.mealName).toBe('Overnight Oats');
    expect(typeof body.parsed).toBe('string');
    expect(Number.isInteger(body.kcal)).toBe(true);
    expect(typeof body.protein).toBe('number');
    expect(typeof body.fat).toBe('number');
    expect(typeof body.carbs).toBe('number');
    expect(body.fiber === null || typeof body.fiber === 'number').toBe(true);
    expect(Array.isArray(body.questions)).toBe(true);

    await prisma.emailOtp.deleteMany({ where: { email: 'ai-voice@leanamp.local' } });
    await prisma.user.deleteMany({ where: { email: 'ai-voice@leanamp.local' } });
    await voiceApp.close();
  });

  it('returns meal data for food photo', async () => {
    const visionProvider: AiProvider = {
      generateText: async () => JSON.stringify({}),
      generateVision: async () =>
        JSON.stringify({
          status: 'OK',
          mealName: 'Chicken Rice',
          parsed: 'Chicken with rice',
          kcal: 650,
          protein: 45,
          fat: 18,
          carbs: 70,
          fiber: 5,
          confidence: 0.7,
          questions: [],
          disclaimer: 'ESTIMATE'
        })
    };

    const visionApp = buildApp({
      ai: {
        provider: visionProvider,
        cache: new Map(),
        limits: {
          dailyTotal: 100,
          dailyText: 100,
          dailyImage: 10,
          dailyHeavy: 10
        }
      }
    });

    const visionAuth = await getAuthContext(visionApp, 'ai-photo@leanamp.local');

    const response = await visionApp.inject({
      method: 'POST',
      url: '/ai/food/photo',
      headers: visionAuth.headers,
      payload: {
        imageBase64: 'dGVzdA==',
        mimeType: 'image/jpeg'
      }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.mealName).toBe('Chicken Rice');

    await prisma.emailOtp.deleteMany({ where: { email: 'ai-photo@leanamp.local' } });
    await prisma.user.deleteMany({ where: { email: 'ai-photo@leanamp.local' } });
    await visionApp.close();
  });

  it('rejects bodyfat photo without body', async () => {
    const visionProvider: AiProvider = {
      generateText: async () => JSON.stringify({}),
      generateVision: async () =>
        JSON.stringify({
          status: 'NO_BODY',
          reason: 'no person visible'
        })
    };

    const visionApp = buildApp({
      ai: {
        provider: visionProvider,
        cache: new Map(),
        limits: {
          dailyTotal: 100,
          dailyText: 100,
          dailyImage: 10,
          dailyHeavy: 10
        }
      }
    });

    const visionAuth = await getAuthContext(visionApp, 'ai-body@leanamp.local');

    const response = await visionApp.inject({
      method: 'POST',
      url: '/ai/bodyfat/photos',
      headers: visionAuth.headers,
      payload: {
        imageBase64: 'dGVzdA==',
        mimeType: 'image/jpeg'
      }
    });

    expect(response.statusCode).toBe(422);
    expect(response.json().error.code).toBe('AI_IMAGE_NO_BODY');

    await prisma.emailOtp.deleteMany({ where: { email: 'ai-body@leanamp.local' } });
    await prisma.user.deleteMany({ where: { email: 'ai-body@leanamp.local' } });
    await visionApp.close();
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
