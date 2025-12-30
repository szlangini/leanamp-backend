import { env } from '../../config/env';

type ProviderName = 'off' | 'usda';

type GuardConfig = {
  rps: Record<ProviderName, number>;
  timeoutMs: number;
  circuitFails: number;
  cooldownMs: number;
};

type TokenBucket = {
  capacity: number;
  ratePerMs: number;
  tokens: number;
  lastRefill: number;
};

type CircuitState = {
  failures: number;
  openUntil: number | null;
};

export type ProviderErrorCode = 'RATE_LIMITED' | 'CIRCUIT_OPEN' | 'FAILED';

export class ProviderUnavailable extends Error {
  code: ProviderErrorCode;

  constructor(code: ProviderErrorCode) {
    super('Provider unavailable');
    this.code = code;
  }
}

function createTokenBucket(rps: number): TokenBucket {
  const capacity = Math.max(1, rps);
  return {
    capacity,
    ratePerMs: rps / 1000,
    tokens: capacity,
    lastRefill: Date.now()
  };
}

function refillTokens(bucket: TokenBucket, now: number) {
  const elapsed = Math.max(0, now - bucket.lastRefill);
  const refill = elapsed * bucket.ratePerMs;
  bucket.tokens = Math.min(bucket.capacity, bucket.tokens + refill);
  bucket.lastRefill = now;
}

function tryTake(bucket: TokenBucket, now: number): boolean {
  refillTokens(bucket, now);
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return true;
  }
  return false;
}

function ensureCircuit(state: CircuitState, now: number) {
  if (state.openUntil && now >= state.openUntil) {
    state.openUntil = null;
    state.failures = 0;
  }
}

export function createProviderGuard(config: GuardConfig) {
  const buckets = new Map<ProviderName, TokenBucket>();
  const circuits = new Map<ProviderName, CircuitState>();

  const getBucket = (name: ProviderName) => {
    const existing = buckets.get(name);
    if (existing) return existing;
    const bucket = createTokenBucket(config.rps[name]);
    buckets.set(name, bucket);
    return bucket;
  };

  const getCircuit = (name: ProviderName) => {
    const existing = circuits.get(name);
    if (existing) return existing;
    const circuit = { failures: 0, openUntil: null } as CircuitState;
    circuits.set(name, circuit);
    return circuit;
  };

  const guardedCall = async <T>(
    provider: ProviderName,
    fn: (signal: AbortSignal) => Promise<T>
  ): Promise<T> => {
    const now = Date.now();
    const circuit = getCircuit(provider);
    ensureCircuit(circuit, now);

    if (circuit.openUntil && now < circuit.openUntil) {
      throw new ProviderUnavailable('CIRCUIT_OPEN');
    }

    const rps = config.rps[provider];
    if (rps > 0) {
      const bucket = getBucket(provider);
      if (!tryTake(bucket, now)) {
        throw new ProviderUnavailable('RATE_LIMITED');
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const result = await fn(controller.signal);
      circuit.failures = 0;
      circuit.openUntil = null;
      return result;
    } catch {
      circuit.failures += 1;
      if (circuit.failures >= config.circuitFails) {
        circuit.openUntil = Date.now() + config.cooldownMs;
      }
      throw new ProviderUnavailable('FAILED');
    } finally {
      clearTimeout(timeout);
    }
  };

  return {
    guardedCall
  };
}

export const providerGuard = createProviderGuard({
  rps: {
    off: env.PROVIDER_OFF_RPS,
    usda: env.PROVIDER_USDA_RPS
  },
  timeoutMs: env.PROVIDER_TIMEOUT_MS,
  circuitFails: env.PROVIDER_CIRCUIT_FAILS,
  cooldownMs: env.PROVIDER_CIRCUIT_COOLDOWN_MS
});
