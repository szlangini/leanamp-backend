import crypto from 'crypto';
import { Prisma } from '@prisma/client';
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
import {
  PROMPT_VERSION,
  buildActivityPrompt,
  buildFoodDescribePrompt,
  buildInsightsPrompt
} from './prompts';
import { callGeminiText, callGeminiVision } from './provider/gemini';

const EMOJI_MAP: Record<string, string> = {
  '[OK]': '✅',
  '[WARN]': '⚠️',
  '[FIX]': '🛠️'
};

const IMAGE_KINDS: AiKind[] = ['FOOD_PHOTO', 'BODYFAT'];
const HEAVY_KINDS: AiKind[] = ['INSIGHTS'];

export type AiKind =
  | 'INSIGHTS'
  | 'ACTIVITY'
  | 'FOOD_TEXT'
  | 'VOICE_TO_MEAL'
  | 'FOOD_PHOTO'
  | 'BODYFAT';

export type AiProvider = {
  generateText: (prompt: string) => Promise<string>;
  generateVision?: (prompt: string) => Promise<string>;
};

type CacheEntry = {
  expiresAt: number;
  payload: unknown;
};

type AiLimits = {
  dailyTotal: number;
  dailyText: number;
  dailyImage: number;
  dailyHeavy: number;
};

type DailyCounts = {
  total: number;
  text: number;
  image: number;
  heavy: number;
};

type AiServiceOptions = {
  provider?: AiProvider;
  cache?: Map<string, CacheEntry>;
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
const TTL_MS = env.AI_CACHE_TTL_HOURS * 60 * 60 * 1000;

function getDayRange(now: Date) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return { start, end };
}

function hashPayload(payload: string) {
  return crypto.createHash('sha256').update(payload).digest('hex');
}

function cacheKey(kind: AiKind, model: string, input: unknown) {
  const payload = JSON.stringify({ kind, model, input, promptVersion: PROMPT_VERSION });
  return hashPayload(payload);
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

async function getDailyCounts(
  tx: Prisma.TransactionClient,
  userId: string | null,
  start: Date,
  end: Date
): Promise<DailyCounts> {
  const where = {
    createdAt: {
      gte: start,
      lt: end
    },
    userId: userId ?? null
  };

  const rows = await tx.aiCallLog.groupBy({
    by: ['kind'],
    where,
    _count: { _all: true }
  });

  const counts = {
    total: 0,
    text: 0,
    image: 0,
    heavy: 0
  };

  for (const row of rows) {
    const count = row._count._all;
    const kind = row.kind as AiKind;
    counts.total += count;
    if (IMAGE_KINDS.includes(kind)) {
      counts.image += count;
    } else {
      counts.text += count;
    }
    if (HEAVY_KINDS.includes(kind)) {
      counts.heavy += count;
    }
  }

  return counts;
}

function enforceDailyCaps(counts: DailyCounts, kind: AiKind, limits: AiLimits) {
  if (counts.total >= limits.dailyTotal) {
    throw new AiServiceError('AI_RATE_LIMIT', 429, 'AI daily limit reached');
  }

  if (IMAGE_KINDS.includes(kind)) {
    if (counts.image >= limits.dailyImage) {
      throw new AiServiceError('AI_RATE_LIMIT', 429, 'AI daily limit reached');
    }
  } else if (counts.text >= limits.dailyText) {
    throw new AiServiceError('AI_RATE_LIMIT', 429, 'AI daily limit reached');
  }

  if (HEAVY_KINDS.includes(kind) && counts.heavy >= limits.dailyHeavy) {
    throw new AiServiceError('AI_RATE_LIMIT', 429, 'AI daily limit reached');
  }
}

async function reserveLog(
  userId: string | null,
  kind: AiKind,
  model: string,
  inputBytes: number,
  isEstimate: boolean,
  now: Date,
  limits: AiLimits
) {
  return prisma.$transaction(async (tx) => {
    const { start, end } = getDayRange(now);
    const counts = await getDailyCounts(tx, userId, start, end);
    enforceDailyCaps(counts, kind, limits);

    const log = await tx.aiCallLog.create({
      data: {
        userId,
        kind,
        provider: 'gemini',
        model,
        latencyMs: 0,
        success: false,
        inputBytes,
        outputBytes: 0,
        promptVersion: PROMPT_VERSION,
        isEstimate
      }
    });

    return log.id;
  });
}

async function finalizeLog(logId: string | null, latencyMs: number, success: boolean, outputBytes: number) {
  if (!logId) return;
  try {
    await prisma.aiCallLog.update({
      where: { id: logId },
      data: {
        latencyMs,
        success,
        outputBytes
      }
    });
  } catch {
    // ignore logging failures
  }
}

async function runAiRequest<T>(
  provider: AiProvider,
  cache: Map<string, CacheEntry>,
  nowProvider: () => Date,
  limits: AiLimits,
  context: RunContext
): Promise<T> {
  const now = nowProvider();
  const key = cacheKey(context.kind, context.model, context.cacheInput);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now.getTime()) {
    return cached.payload as T;
  }

  const inputBytes = Buffer.byteLength(context.prompt, 'utf8');
  let logId: string | null = null;
  try {
    logId = await reserveLog(
      context.userId,
      context.kind,
      context.model,
      inputBytes,
      context.isEstimate,
      now,
      limits
    );
  } catch (error) {
    if (error instanceof AiServiceError) {
      throw error;
    }
    throw new AiServiceError('AI_PROVIDER_DOWN', 502, 'AI provider unavailable');
  }

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
    const outputBytes = Buffer.byteLength(outputText ?? '', 'utf8');
    await finalizeLog(logId, latencyMs, success, outputBytes);
  }
}

export function createAiService(options: AiServiceOptions = {}) {
  const provider = options.provider ?? defaultProvider;
  const cache = options.cache ?? defaultCache;
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
      return runAiRequest<AiInsightsResponse>(provider, cache, nowProvider, limits, {
        userId,
        kind: 'INSIGHTS',
        prompt,
        cacheInput: input,
        schema: AiInsightsResponseSchema,
        model: env.GEMINI_MODEL_TEXT,
        isEstimate: false,
        postProcess: (value) => applyInsightsReplacements(value as AiInsightsResponse)
      });
    },

    async activityEstimate(
      userId: string | null,
      input: AiActivityEstimateInput
    ): Promise<AiActivityEstimateResponse> {
      const prompt = buildActivityPrompt(input);
      return runAiRequest<AiActivityEstimateResponse>(provider, cache, nowProvider, limits, {
        userId,
        kind: 'ACTIVITY',
        prompt,
        cacheInput: input,
        schema: AiActivityEstimateResponseSchema,
        model: env.GEMINI_MODEL_TEXT,
        isEstimate: true
      });
    },

    async foodDescribe(
      userId: string | null,
      input: AiFoodDescribeInput
    ): Promise<AiFoodDescribeResponse> {
      const prompt = buildFoodDescribePrompt(input, 'text');
      return runAiRequest<AiFoodDescribeResponse>(provider, cache, nowProvider, limits, {
        userId,
        kind: 'FOOD_TEXT',
        prompt,
        cacheInput: input,
        schema: AiFoodDescribeResponseSchema,
        model: env.GEMINI_MODEL_TEXT,
        isEstimate: true
      });
    },

    async voiceToMeal(
      userId: string | null,
      input: AiFoodDescribeInput
    ): Promise<AiFoodDescribeResponse> {
      const prompt = buildFoodDescribePrompt(input, 'voice');
      return runAiRequest<AiFoodDescribeResponse>(provider, cache, nowProvider, limits, {
        userId,
        kind: 'VOICE_TO_MEAL',
        prompt,
        cacheInput: input,
        schema: AiFoodDescribeResponseSchema,
        model: env.GEMINI_MODEL_TEXT,
        isEstimate: true
      });
    }
  };
}
