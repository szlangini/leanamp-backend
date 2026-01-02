import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { env } from '../../config/env';
import { prisma } from '../../db/prisma';
import {
  AiActivityEstimateResponseSchema,
  AiBodyfatPhotoResponseSchema,
  AiFoodDescribeResponseSchema,
  AiFoodPhotoResponseSchema,
  AiInsightsResponseSchema,
  type AiActivityEstimateInput,
  type AiBodyfatPhotoResponse,
  type AiFoodDescribeInput,
  type AiFoodPhotoResponse,
  type AiImageInput,
  type AiInsightsInput,
  type AiInsightsResponse,
  type AiActivityEstimateResponse,
  type AiFoodDescribeResponse
} from './schemas';
import {
  PROMPT_VERSION,
  buildActivityPrompt,
  buildBodyfatPrompt,
  buildFoodDescribePrompt,
  buildFoodPhotoPrompt,
  buildInsightsPrompt
} from './prompts';
import { callGeminiText, callGeminiVision } from './provider/gemini';

const EMOJI_MAP: Record<string, string> = {
  '[OK]': '✅',
  '[WARN]': '⚠️',
  '[FIX]': '🛠️'
};

const INSIGHTS_KEYS = new Set(['CAL', 'PROTEIN', 'WATER', 'MOVE', 'STRENGTH', 'RECOVERY']);
const INSIGHTS_SEVERITIES = new Set(['P1', 'P2', 'P3']);
const ACTION_PRIORITIES = new Set(['HIGH', 'MED', 'LOW']);
const OVERALL_VALUES = new Set(['POS', 'NEU', 'NEG']);

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
  generateVision?: (prompt: string, image: { data: string; mimeType: string }) => Promise<string>;
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
  image?: { data: string; mimeType: string };
  inputBytes?: number;
  preProcess?: (payload: unknown) => unknown;
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

function normalizeInsightsResponse(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  const value = payload as Record<string, unknown>;
  const bulletsRaw = Array.isArray(value.bullets) ? value.bullets : [];
  const actionsRaw = Array.isArray(value.actions) ? value.actions : [];
  const warningsRaw = Array.isArray(value.warnings) ? value.warnings : [];

  const bullets = bulletsRaw
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const item = entry as Record<string, unknown>;
      const k = typeof item.k === 'string' ? item.k.toUpperCase() : '';
      const s = typeof item.s === 'string' ? item.s.toUpperCase() : '';
      const t = typeof item.t === 'string' ? item.t.trim() : '';
      if (!INSIGHTS_KEYS.has(k) || !INSIGHTS_SEVERITIES.has(s) || !t) {
        return null;
      }
      return { k, s, t };
    })
    .filter(Boolean)
    .slice(0, 5) as AiInsightsResponse['bullets'];

  const actions = actionsRaw
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const item = entry as Record<string, unknown>;
      const t = typeof item.t === 'string' ? item.t.trim() : '';
      const p = typeof item.p === 'string' ? item.p.toUpperCase() : '';
      if (!t || !ACTION_PRIORITIES.has(p)) {
        return null;
      }
      return { t, p };
    })
    .filter(Boolean)
    .slice(0, 3) as AiInsightsResponse['actions'];

  const warnings = warningsRaw
    .filter((entry) => typeof entry === 'string' && entry.trim().length > 0)
    .map((entry) => entry.trim());

  const overallRaw = typeof value.overall === 'string' ? value.overall.toUpperCase() : '';
  const overall = OVERALL_VALUES.has(overallRaw) ? overallRaw : 'NEU';

  return {
    status: 'OK',
    overall,
    bullets,
    actions,
    warnings,
    disclaimer: 'ESTIMATE'
  };
}

function isLowDataInsights(input: AiInsightsInput) {
  const macroSum =
    input.macros.proteinG +
    input.macros.fatG +
    input.macros.carbsG +
    (input.macros.fiberG ?? 0);

  const signals = [
    input.calories.intakeAvg > 100,
    macroSum > 15,
    input.water.litersAvg > 0.25,
    input.movement.stepsAvg > 1000,
    input.movement.exerciseCount > 0,
    typeof input.weight.rateKgPerWeek === 'number' &&
      Math.abs(input.weight.rateKgPerWeek) >= 0.1
  ].filter(Boolean).length;

  return signals <= 1;
}

function lowDataInsightsResponse(): AiInsightsResponse {
  const message = 'Not enough data yet — log 7–14 days for reliable insights.';
  return {
    status: 'OK',
    overall: 'NEU',
    bullets: [
      {
        k: 'CAL',
        s: 'P2',
        t: `⚠️ ${message}`
      }
    ],
    actions: [
      {
        t: 'Log food, water, steps, and training for 7–14 days so we can personalize.',
        p: 'HIGH'
      }
    ],
    warnings: [message],
    disclaimer: 'ESTIMATE'
  };
}

function coerceNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function normalizeActivityResponse(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }
  const value = payload as Record<string, unknown>;
  const kcal = coerceNumber(value.kcal);
  const confidence = coerceNumber(value.confidence);
  const suggestedName =
    typeof value.suggestedName === 'string' && value.suggestedName.trim().length > 0
      ? value.suggestedName.trim()
      : undefined;

  return {
    status: typeof value.status === 'string' ? value.status : 'OK',
    kcal: kcal !== undefined ? Math.round(kcal) : value.kcal,
    confidence: confidence !== undefined ? Math.min(1, Math.max(0, confidence)) : value.confidence,
    notes: typeof value.notes === 'string' ? value.notes : '',
    disclaimer: typeof value.disclaimer === 'string' ? value.disclaimer : 'ESTIMATE',
    ...(suggestedName ? { suggestedName } : {})
  };
}

function normalizeFoodResponse(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }
  const value = payload as Record<string, unknown>;
  const kcal = coerceNumber(value.kcal);
  const protein = coerceNumber(value.protein);
  const fat = coerceNumber(value.fat);
  const carbs = coerceNumber(value.carbs);
  const fiber = value.fiber === null ? null : coerceNumber(value.fiber);
  const questions = Array.isArray(value.questions)
    ? value.questions.filter((item) => typeof item === 'string')
    : [];

  return {
    status: typeof value.status === 'string' ? value.status : 'OK',
    mealName: typeof value.mealName === 'string' ? value.mealName : '',
    parsed: typeof value.parsed === 'string' ? value.parsed : '',
    kcal: kcal !== undefined ? Math.round(kcal) : value.kcal,
    protein: protein ?? value.protein,
    fat: fat ?? value.fat,
    carbs: carbs ?? value.carbs,
    fiber: fiber ?? null,
    confidence: coerceNumber(value.confidence) ?? value.confidence,
    questions,
    disclaimer: typeof value.disclaimer === 'string' ? value.disclaimer : 'ESTIMATE'
  };
}

const MEAL_NAME_STOP = new Set(['and', 'with', 'of', 'a', 'an', 'the', 'in', 'on']);
const ACTIVITY_NAME_STOP = new Set(['and', 'with', 'of', 'a', 'an', 'the', 'in', 'on']);

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => token[0]?.toUpperCase() + token.slice(1))
    .join(' ');
}

function deriveMealName(text: string) {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !MEAL_NAME_STOP.has(token));
  const picked = tokens.slice(0, 2);
  const fallback = picked.length > 0 ? titleCase(picked.join(' ')) : 'Meal';
  return fallback.trim() || 'Meal';
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function sanitizeMealResponse(
  input: AiFoodDescribeInput,
  response: AiFoodDescribeResponse
): AiFoodDescribeResponse {
  const mealName = response.mealName?.trim();
  const parsed = response.parsed?.trim();

  return {
    ...response,
    mealName: mealName && mealName.length > 0 ? mealName : deriveMealName(input.text),
    parsed: parsed && parsed.length > 0 ? parsed : input.text.trim(),
    kcal: Math.round(response.kcal),
    protein: round1(response.protein),
    fat: round1(response.fat),
    carbs: round1(response.carbs),
    fiber: response.fiber === null ? null : round1(response.fiber)
  };
}

function deriveActivityName(input: AiActivityEstimateInput) {
  if ('type' in input && input.type) {
    return titleCase(input.type);
  }

  const description = 'description' in input ? input.description ?? '' : '';
  const tokens = description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !ACTIVITY_NAME_STOP.has(token));
  const picked = tokens.slice(0, 3);
  const fallback = picked.length > 0 ? titleCase(picked.join(' ')) : 'Activity';
  return fallback.trim() || 'Activity';
}

function sanitizeActivityResponse(
  input: AiActivityEstimateInput,
  response: AiActivityEstimateResponse
): AiActivityEstimateResponse {
  const hasDescription =
    'description' in input && typeof input.description === 'string' && input.description.trim();
  const suggestedName = response.suggestedName?.trim();

  return {
    ...response,
    kcal: Math.round(response.kcal),
    ...(hasDescription
      ? {
          suggestedName:
            suggestedName && suggestedName.length > 0
              ? suggestedName
              : deriveActivityName(input)
        }
      : {})
  };
}

async function resolveActivityInput(
  userId: string | null,
  input: AiActivityEstimateInput
): Promise<AiActivityEstimateInput> {
  if (input.weightKg !== undefined) {
    return input;
  }

  if (!userId) {
    return input;
  }

  try {
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { weightKg: true }
    });

    if (profile?.weightKg !== null && profile?.weightKg !== undefined) {
      return { ...input, weightKg: profile.weightKg };
    }
  } catch {
    // ignore profile lookup issues
  }

  return input;
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

  const inputBytes =
    context.inputBytes ?? Buffer.byteLength(context.prompt, 'utf8');
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
      if (!provider.generateVision || !context.image) {
        throw new AiServiceError('AI_PROVIDER_DOWN', 502, 'AI provider unavailable');
      }
      outputText = await provider.generateVision(context.prompt, context.image);
    } else {
      outputText = await provider.generateText(context.prompt);
    }

    const parsedJson = parseJsonOutput(outputText);
    const prepared = context.preProcess ? context.preProcess(parsedJson) : parsedJson;
    const parsed = context.schema.safeParse(prepared);
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

function parseJsonOutput(outputText: string) {
  let candidate = outputText.trim();
  if (!candidate) {
    throw new AiServiceError('AI_BAD_OUTPUT', 502, 'Invalid AI response');
  }

  const fenced = candidate.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced?.[1]) {
    candidate = fenced[1].trim();
  }

  try {
    return JSON.parse(candidate);
  } catch {
    const firstBrace = candidate.indexOf('{');
    const lastBrace = candidate.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      const slice = candidate.slice(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(slice);
      } catch {
        // fallthrough
      }
    }
    throw new AiServiceError('AI_BAD_OUTPUT', 502, 'Invalid AI response');
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
      if (isLowDataInsights(input)) {
        return applyInsightsReplacements(lowDataInsightsResponse());
      }
      const prompt = buildInsightsPrompt(input);
      return runAiRequest<AiInsightsResponse>(provider, cache, nowProvider, limits, {
        userId,
        kind: 'INSIGHTS',
        prompt,
        cacheInput: input,
        schema: AiInsightsResponseSchema,
        model: env.GEMINI_MODEL_TEXT,
        isEstimate: false,
        preProcess: normalizeInsightsResponse,
        postProcess: (value) => applyInsightsReplacements(value as AiInsightsResponse)
      });
    },

    async activityEstimate(
      userId: string | null,
      input: AiActivityEstimateInput
    ): Promise<AiActivityEstimateResponse> {
      const resolvedInput = await resolveActivityInput(userId, input);
      const prompt = buildActivityPrompt(resolvedInput);
      return runAiRequest<AiActivityEstimateResponse>(provider, cache, nowProvider, limits, {
        userId,
        kind: 'ACTIVITY',
        prompt,
        cacheInput: resolvedInput,
        schema: AiActivityEstimateResponseSchema,
        model: env.GEMINI_MODEL_TEXT,
        isEstimate: true,
        preProcess: normalizeActivityResponse,
        postProcess: (value) =>
          sanitizeActivityResponse(resolvedInput, value as AiActivityEstimateResponse)
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
        isEstimate: true,
        preProcess: normalizeFoodResponse,
        postProcess: (value) => sanitizeMealResponse(input, value as AiFoodDescribeResponse)
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
        isEstimate: true,
        preProcess: normalizeFoodResponse,
        postProcess: (value) => sanitizeMealResponse(input, value as AiFoodDescribeResponse)
      });
    },

    async foodPhoto(
      userId: string | null,
      input: AiImageInput
    ): Promise<AiFoodDescribeResponse> {
      const prompt = buildFoodPhotoPrompt(input.locale);
      const imageHash = hashPayload(input.imageBase64);
      const response = await runAiRequest<AiFoodPhotoResponse>(provider, cache, nowProvider, limits, {
        userId,
        kind: 'FOOD_PHOTO',
        prompt,
        cacheInput: { imageHash, mimeType: input.mimeType, locale: input.locale },
        schema: AiFoodPhotoResponseSchema,
        model: env.GEMINI_MODEL_VISION,
        isEstimate: true,
        useVision: true,
        image: { data: input.imageBase64, mimeType: input.mimeType },
        inputBytes:
          Buffer.byteLength(prompt, 'utf8') +
          Buffer.byteLength(input.imageBase64, 'utf8')
      });

      if (response.status === 'NOT_FOOD') {
        throw new AiServiceError('AI_IMAGE_NOT_FOOD', 422, 'Image is not food');
      }
      if (response.status === 'SEXUAL_CONTENT') {
        throw new AiServiceError('AI_IMAGE_SEXUAL', 422, 'Image content not allowed');
      }
      if (response.status !== 'OK') {
        throw new AiServiceError('AI_BAD_OUTPUT', 502, 'Invalid AI response');
      }

      return sanitizeMealResponse(
        { text: response.parsed ?? response.mealName ?? 'Meal', locale: input.locale },
        response as AiFoodDescribeResponse
      );
    },

    async bodyfatPhoto(
      userId: string | null,
      input: AiImageInput
    ): Promise<AiBodyfatPhotoResponse> {
      const prompt = buildBodyfatPrompt(input.locale);
      const imageHash = hashPayload(input.imageBase64);
      const response = await runAiRequest<AiBodyfatPhotoResponse>(provider, cache, nowProvider, limits, {
        userId,
        kind: 'BODYFAT',
        prompt,
        cacheInput: { imageHash, mimeType: input.mimeType, locale: input.locale },
        schema: AiBodyfatPhotoResponseSchema,
        model: env.GEMINI_MODEL_VISION,
        isEstimate: true,
        useVision: true,
        image: { data: input.imageBase64, mimeType: input.mimeType },
        inputBytes:
          Buffer.byteLength(prompt, 'utf8') +
          Buffer.byteLength(input.imageBase64, 'utf8')
      });

      if (response.status === 'NO_BODY') {
        throw new AiServiceError('AI_IMAGE_NO_BODY', 422, 'No body detected');
      }
      if (response.status === 'SEXUAL_CONTENT') {
        throw new AiServiceError('AI_IMAGE_SEXUAL', 422, 'Image content not allowed');
      }
      if (response.status !== 'OK') {
        throw new AiServiceError('AI_BAD_OUTPUT', 502, 'Invalid AI response');
      }

      return response;
    }
  };
}
