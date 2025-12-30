const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3001';
const AUTH_MODE = process.env.AUTH_MODE ?? 'dev';
const DEV_OTP_ECHO = (process.env.DEV_OTP_ECHO ?? 'false').toLowerCase() === 'true';
const DEV_USER_ID = process.env.SMOKE_DEV_USER_ID ?? '00000000-0000-0000-0000-000000000001';
const AUTH_EMAIL = process.env.SMOKE_AUTH_EMAIL ?? 'smoke@leanamp.local';

function fail(message: string): never {
  console.error(`[smoke] ${message}`);
  process.exit(1);
}

async function request(path: string, options?: RequestInit) {
  const response = await fetch(`${BASE_URL}${path}`, options);
  return response;
}

async function getAuthHeaders(): Promise<Record<string, string> | null> {
  if (AUTH_MODE === 'dev') {
    return { 'x-dev-user': DEV_USER_ID };
  }

  if (AUTH_MODE === 'jwt' && DEV_OTP_ECHO) {
    const start = await request('/auth/email/start', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: AUTH_EMAIL })
    });

    if (!start.ok) {
      fail(`auth start failed: ${start.status}`);
    }

    const startBody = (await start.json()) as { code?: string };
    if (!startBody.code) {
      fail('auth start did not return code');
    }

    const verify = await request('/auth/email/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: AUTH_EMAIL, code: startBody.code, deviceName: 'smoke' })
    });

    if (!verify.ok) {
      fail(`auth verify failed: ${verify.status}`);
    }

    const verifyBody = (await verify.json()) as { accessToken?: string };
    if (!verifyBody.accessToken) {
      fail('auth verify did not return access token');
    }

    return { authorization: `Bearer ${verifyBody.accessToken}` };
  }

  return null;
}

async function main() {
  const health = await request('/health');
  if (!health.ok) {
    fail(`health failed: ${health.status}`);
  }

  const openapi = await request('/openapi.json');
  if (!openapi.ok && openapi.status !== 404) {
    fail(`openapi failed: ${openapi.status}`);
  }

  const authHeaders = await getAuthHeaders();
  if (authHeaders) {
    const profile = await request('/profile', { headers: authHeaders });
    if (!profile.ok) {
      fail(`profile failed: ${profile.status}`);
    }

    const catalog = await request('/food/catalog/search?q=chicken&limit=5', {
      headers: authHeaders
    });
    if (!catalog.ok) {
      fail(`food catalog search failed: ${catalog.status}`);
    }
  } else {
    console.warn('[smoke] auth not configured; skipped /profile and /food/catalog/search');
  }

  console.log('[smoke] ok');
}

main().catch((error) => {
  console.error('[smoke] unexpected error');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
