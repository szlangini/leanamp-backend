import crypto from 'crypto';
import type { Prisma } from '@prisma/client';
import { env } from '../../config/env';
import { prisma } from '../../db/prisma';
import {
  AiActivityEstimateResponseSchema,
  AiFoodDescribeResponseSchema,
  AiInsightsResponseSchema,
  type AiActivityEstimateInput,
  type AiFoodDescribeInput,
  type AiInsightsInput,
  type AiInsightsResponse,
  type AiActivityEstimateResponse,
  type AiFoodDescribeResponse
} from './schemas';
import { PROMPT_VERSION, buildActivityPrompt, buildFoodDescribePrompt, buildInsightsPrompt } from './prompts';
import { callGeminiText, callGeminiVision } from './provider/gemini';

const EMOJI_MAP: Record<string, string> = {
  '[OK]': '✅',
  '[WARN]': '⚠️',
  '[FIX]': '🛠️'
};

export type AiKind = 'INSIGHTS' | 'ACTIVITY' | 'FOOD_TEXT' | 'VOICE_TO_MEAL' | 'FOOD_PHOTO' | 'BODYFAT';

export type AiProvider = {
  generateText: (prompt: string) => Promise<string>;
  generateVision?: (prompt: string) => Promise<string>;
};

type CacheEntry = {
  expiresAt: number;
  payload: unknown;
};

type AiCounters = Map<string, number>;

type AiLimits = {
  dailyTotal: number;
  dailyText: number;
  dailyImage: number;
  dailyHeavy: number;
};

type AiServiceOptions = {
  provider?: AiProvider;
  cache?: Map<string, CacheEntry>;
  counters?: AiCounters;
  now?: () => Date;
  limits?: Partial<AiLimits>;
};

type RunContext = {
  userId: string | null;
  kind: AiKind;
  prompt: string;
  cacheInput: unknown;
  schema: {
    safeParse: (value: unknown) => { success: boolean; data?: unknown };
  };
  model: string;
  isEstimate: boolean;
  useVision?: boolean;
  postProcess?: (payload: unknown) => unknown;
};

export class AiServiceError extends Error {
  code: string;
  status: number;

  constructor(code: string, status: number, message: string) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const defaultProvider: AiProvider = {
  generateText: callGeminiText,
  generateVision: callGeminiVision
};

const defaultCache = new Map<string, CacheEntry>();
const defaultCounters: AiCounters = new Map();
const TTL_MS = env.AI_CACHE_TTL_HOURS * 60 * 60 * 1000;

function getDayKey(now: Date) {
  return now.toISOString().slice(0, 10);
}

function hashPayload(payload: string) {
  return crypto.createHash('sha256').update(payload).digest('hex');
}

function cacheKey(kind: AiKind, model: string, input: unknown) {
  const payload = JSON.stringify({ kind, model, input, promptVersion: PROMPT_VERSION });
  return hashPayload(payload);
}

function getCounterKey(day: string, user: string, bucket: string) {
  return `${day}:${user}:${bucket}`;
}

function incrementCounter(counters: AiCounters, key: string, limit: number) {
  const current = counters.get(key) ?? 0;
  if (current >= limit) {
    throw new AiServiceError('AI_RATE_LIMIT', 429, 'AI daily limit reached');
  }
  counters.set(key, current + 1);
}

function enforceDailyCaps(
  counters: AiCounters,
  now: Date,
  userId: string,
  kind: AiKind,
  limits: AiLimits
) {
  const day = getDayKey(now);
  incrementCounter(counters, getCounterKey(day, userId, 'total'), limits.dailyTotal);

  const isImage = kind === 'FOOD_PHOTO' || kind === 'BODYFAT';
  const isHeavy = kind === 'INSIGHTS';
  if (isImage) {
    incrementCounter(counters, getCounterKey(day, userId, 'image'), limits.dailyImage);
  } else {
    incrementCounter(counters, getCounterKey(day, userId, 'text'), limits.dailyText);
  }
  if (isHeavy) {
    incrementCounter(counters, getCounterKey(day, userId, 'heavy'), limits.dailyHeavy);
  }
}

function replaceTokens(value: string) {
  return Object.entries(EMOJI_MAP).reduce(
    (acc, [token, emoji]) => acc.replaceAll(token, emoji),
    value
  );
}

function applyInsightsReplacements(response: AiInsightsResponse) {
  return {
    ...response,
    bullets: response.bullets.map((bullet) => ({
      ...bullet,
      t: replaceTokens(bullet.t)
    })),
    actions: response.actions.map((action) => ({
      ...action,
      t: replaceTokens(action.t)
    })),
    warnings: response.warnings.map((warning) => replaceTokens(warning))
  };
}

async function logCall(
  data: Prisma.AiCallLogCreateInput,
  options: { skip?: boolean } = {}
) {
  if (options.skip) return;
  try {
    await prisma.aiCallLog.create({ data });
  } catch {
    // ignore logging failures
  }
}

async function runAiRequest<T>(
  provider: AiProvider,
  cache: Map<string, CacheEntry>,
  counters: AiCounters,
  nowProvider: () => Date,
  limits: AiLimits,
  context: RunContext
): Promise<T> {
  const now = nowProvider();
  const userKey = context.userId ?? 'dev';
  const key = cacheKey(context.kind, context.model, context.cacheInput);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now.getTime()) {
    return cached.payload as T;
  }

  enforceDailyCaps(counters, now, userKey, context.kind, limits);

  const started = Date.now();
  let outputText = '';
  let success = false;

  try {
    if (context.useVision) {
      if (!provider.generateVision) {
        throw new AiServiceError('AI_PROVIDER_DOWN', 502, 'AI provider unavailable');
      }
      outputText = await provider.generateVision(context.prompt);
    } else {
      outputText = await provider.generateText(context.prompt);
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(outputText);
    } catch {
      throw new AiServiceError('AI_BAD_OUTPUT', 502, 'Invalid AI response');
    }
    const parsed = context.schema.safeParse(parsedJson);
    if (!parsed.success) {
      throw new AiServiceError('AI_BAD_OUTPUT', 502, 'Invalid AI response');
    }

    const payload = (context.postProcess
      ? context.postProcess(parsed.data)
      : parsed.data) as T;
    cache.set(key, {
      expiresAt: now.getTime() + TTL_MS,
      payload
    });

    success = true;
    return payload;
  } catch (error) {
    if (error instanceof AiServiceError) {
      throw error;
    }
    throw new AiServiceError('AI_PROVIDER_DOWN', 502, 'AI provider unavailable');
  } finally {
    const latencyMs = Math.max(0, Date.now() - started);
    await logCall({
      userId: context.userId ?? null,
      kind: context.kind,
      provider: 'gemini',
      model: context.model,
      latencyMs,
      success,
      inputBytes: Buffer.byteLength(context.prompt, 'utf8'),
      outputBytes: Buffer.byteLength(outputText ?? '', 'utf8'),
      promptVersion: PROMPT_VERSION,
      isEstimate: context.isEstimate
    });
  }
}

export function createAiService(options: AiServiceOptions = {}) {
  const provider = options.provider ?? defaultProvider;
  const cache = options.cache ?? defaultCache;
  const counters = options.counters ?? defaultCounters;
  const nowProvider = options.now ?? (() => new Date());
  const limits: AiLimits = {
    dailyTotal: env.AI_DAILY_CALLS_MAX,
    dailyText: env.AI_DAILY_TEXT_CALLS_MAX,
    dailyImage: env.AI_DAILY_IMAGE_CALLS_MAX,
    dailyHeavy: 10,
    ...options.limits
  };

  return {
    async insights(userId: string | null, input: AiInsightsInput): Promise<AiInsightsResponse> {
      const prompt = buildInsightsPrompt(input);
      return runAiRequest<AiInsightsResponse>(
        provider,
        cache,
        counters,
        nowProvider,
        limits,
        {
          userId,
          kind: 'INSIGHTS',
          prompt,
          cacheInput: input,
          schema: AiInsightsResponseSchema,
          model: env.GEMINI_MODEL_TEXT,
          isEstimate: false,
          postProcess: (value) => applyInsightsReplacements(value as AiInsightsResponse)
        }
      );
    },

    async activityEstimate(
      userId: string | null,
      input: AiActivityEstimateInput
    ): Promise<AiActivityEstimateResponse> {
      const prompt = buildActivityPrompt(input);
      return runAiRequest<AiActivityEstimateResponse>(
        provider,
        cache,
        counters,
        nowProvider,
        limits,
        {
          userId,
          kind: 'ACTIVITY',
          prompt,
          cacheInput: input,
          schema: AiActivityEstimateResponseSchema,
          model: env.GEMINI_MODEL_TEXT,
          isEstimate: true
        }
      );
    },

    async foodDescribe(
      userId: string | null,
      input: AiFoodDescribeInput
    ): Promise<AiFoodDescribeResponse> {
      const prompt = buildFoodDescribePrompt(input, 'text');
      return runAiRequest<AiFoodDescribeResponse>(
        provider,
        cache,
        counters,
        nowProvider,
        limits,
        {
          userId,
          kind: 'FOOD_TEXT',
          prompt,
          cacheInput: input,
          schema: AiFoodDescribeResponseSchema,
          model: env.GEMINI_MODEL_TEXT,
          isEstimate: true
        }
      );
    },

    async voiceToMeal(
      userId: string | null,
      input: AiFoodDescribeInput
    ): Promise<AiFoodDescribeResponse> {
      const prompt = buildFoodDescribePrompt(input, 'voice');
      return runAiRequest<AiFoodDescribeResponse>(
        provider,
        cache,
        counters,
        nowProvider,
        limits,
        {
          userId,
          kind: 'VOICE_TO_MEAL',
          prompt,
          cacheInput: input,
          schema: AiFoodDescribeResponseSchema,
          model: env.GEMINI_MODEL_TEXT,
          isEstimate: true
        }
      );
    }
  };
}
