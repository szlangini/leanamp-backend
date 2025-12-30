import { describe, expect, it, vi } from 'vitest';
import { createProviderGuard, ProviderUnavailable } from './providerGuard';

describe('provider guard', () => {
  it('rate limits calls by provider', async () => {
    const guard = createProviderGuard({
      rps: { off: 1, usda: 1 },
      timeoutMs: 200,
      circuitFails: 5,
      cooldownMs: 100
    });

    await guard.guardedCall('off', async () => 'ok');

    await expect(
      guard.guardedCall('off', async () => 'ok')
    ).rejects.toMatchObject({ code: 'RATE_LIMITED' });
  });

  it('opens circuit after failures and recovers', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));

    const guard = createProviderGuard({
      rps: { off: 10, usda: 10 },
      timeoutMs: 200,
      circuitFails: 2,
      cooldownMs: 50
    });

    const fail = async () => {
      throw new Error('fail');
    };

    await expect(guard.guardedCall('off', fail)).rejects.toBeInstanceOf(
      ProviderUnavailable
    );
    await expect(guard.guardedCall('off', fail)).rejects.toMatchObject({
      code: 'FAILED'
    });
    await expect(guard.guardedCall('off', async () => 'ok')).rejects.toMatchObject({
      code: 'CIRCUIT_OPEN'
    });

    vi.advanceTimersByTime(60);

    await expect(guard.guardedCall('off', async () => 'ok')).resolves.toBe('ok');

    vi.useRealTimers();
  });
});
