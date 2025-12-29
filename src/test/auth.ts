import type { FastifyInstance } from 'fastify';

export type AuthContext = {
  userId: string;
  accessToken: string;
  refreshToken: string;
  headers: Record<string, string>;
  email: string;
};

export async function getAuthContext(
  app: FastifyInstance,
  email: string,
  deviceName = 'test'
): Promise<AuthContext> {
  const startResponse = await app.inject({
    method: 'POST',
    url: '/auth/email/start',
    payload: { email }
  });

  if (startResponse.statusCode !== 200) {
    throw new Error(`Failed to start auth: ${startResponse.statusCode}`);
  }

  const startBody = startResponse.json() as { code?: string };
  const code = startBody.code;
  if (!code) {
    throw new Error('Missing OTP code in dev mode');
  }

  const verifyResponse = await app.inject({
    method: 'POST',
    url: '/auth/email/verify',
    payload: { email, code, deviceName }
  });

  if (verifyResponse.statusCode !== 200) {
    throw new Error(`Failed to verify auth: ${verifyResponse.statusCode}`);
  }

  const verifyBody = verifyResponse.json() as {
    user: { id: string };
    accessToken: string;
    refreshToken: string;
  };

  return {
    userId: verifyBody.user.id,
    accessToken: verifyBody.accessToken,
    refreshToken: verifyBody.refreshToken,
    headers: {
      authorization: `Bearer ${verifyBody.accessToken}`
    },
    email
  };
}
