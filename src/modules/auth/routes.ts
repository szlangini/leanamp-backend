import type { FastifyInstance } from 'fastify';
import { badRequest, sendError, tooManyRequests, unauthorized } from '../../utils/errors';
import { env } from '../../config/env';
import { EmailStartSchema, EmailVerifySchema, SignoutSchema } from './schemas';
import { createEmailOtp, deleteAccount, revokeSession, verifyEmailOtp } from './service';

export default async function authRoutes(app: FastifyInstance) {
  const startRateLimit = {
    max: env.NODE_ENV === 'test' ? 1000 : 5,
    timeWindow: '1 minute'
  };

  const verifyRateLimit = {
    max: env.NODE_ENV === 'test' ? 1000 : 10,
    timeWindow: '1 minute'
  };

  app.post(
    '/email/start',
    {
      config: {
        rateLimit: startRateLimit
      }
    },
    async (request, reply) => {
      const parsed = EmailStartSchema.safeParse(request.body);
      if (!parsed.success) {
        return badRequest(reply, 'Invalid email start payload', parsed.error.flatten());
      }

      const { code } = await createEmailOtp(parsed.data.email);
      const response: { ok: true; dummy: boolean; code?: string } = {
        ok: true,
        dummy: env.DEV_OTP_ECHO
      };

      if (env.DEV_OTP_ECHO) {
        response.code = code;
      }

      return reply.send(response);
    }
  );

  app.post(
    '/email/verify',
    {
      config: {
        rateLimit: verifyRateLimit
      }
    },
    async (request, reply) => {
      const parsed = EmailVerifySchema.safeParse(request.body);
      if (!parsed.success) {
        return badRequest(reply, 'Invalid email verify payload', parsed.error.flatten());
      }

      const result = await verifyEmailOtp(
        parsed.data.email,
        parsed.data.code,
        parsed.data.deviceName
      );

      if (!result.ok) {
        if (result.reason === 'locked') {
          return tooManyRequests(reply, 'Too many attempts');
        }
        return badRequest(reply, 'Invalid or expired code');
      }

      return reply.send({
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresAtISO: result.expiresAt.toISOString()
      });
    }
  );

  app.post('/signout', async (request, reply) => {
    const parsed = SignoutSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return badRequest(reply, 'Invalid signout payload', parsed.error.flatten());
    }

    const authHeader = request.headers.authorization;
    const headerToken = authHeader?.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : undefined;

    const refreshToken = parsed.data.refreshToken ?? headerToken;
    if (refreshToken) {
      await revokeSession(refreshToken);
    }

    return reply.send({ ok: true });
  });

  app.delete('/account', async (request, reply) => {
    if (!request.user?.id) {
      return unauthorized(reply, 'Missing access token');
    }

    await deleteAccount(request.user.id);
    return reply.send({ ok: true });
  });

  app.post('/apple', async (_request, reply) => {
    return sendError(reply, 501, 'NOT_IMPLEMENTED', 'Apple sign-in not implemented');
  });

  app.post('/google', async (_request, reply) => {
    return sendError(reply, 501, 'NOT_IMPLEMENTED', 'Google sign-in not implemented');
  });
}
