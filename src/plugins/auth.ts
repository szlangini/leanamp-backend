import type { FastifyInstance, FastifyRequest } from 'fastify';
import { env } from '../config/env';
import { verifyAccessToken } from '../auth/jwt';
import { prisma } from '../db/prisma';
import { unauthorized } from '../utils/errors';

const PUBLIC_USER_ID = '00000000-0000-0000-0000-000000000000';

const PUBLIC_PATHS = new Set([
  '/health',
  '/openapi.json',
  '/auth/email/start',
  '/auth/email/verify',
  '/auth/signout',
  '/auth/apple',
  '/auth/google'
]);

const PUBLIC_PREFIXES = ['/docs'];

function resolveHeaderValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function getPathname(request: FastifyRequest): string {
  const url = request.raw.url ?? request.url;
  return url.split('?')[0] || '/';
}

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) {
    return true;
  }

  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

async function resolveDevUserId(request: FastifyRequest): Promise<string> {
  const devHeader = resolveHeaderValue(request.headers['x-dev-user']);
  const legacyHeader = resolveHeaderValue(request.headers['x-user-id']);
  const identity = devHeader || legacyHeader;

  if (identity && identity.includes('@')) {
    const user = await prisma.user.upsert({
      where: { email: identity },
      update: {},
      create: { email: identity }
    });
    return user.id;
  }

  if (identity) {
    await prisma.user.upsert({
      where: { id: identity },
      update: {},
      create: { id: identity }
    });
    return identity;
  }

  const user = await prisma.user.upsert({
    where: { email: env.AUTH_DEV_DEFAULT_EMAIL },
    update: {},
    create: { email: env.AUTH_DEV_DEFAULT_EMAIL }
  });

  return user.id;
}

export default function authPlugin(app: FastifyInstance) {
  app.decorateRequest('user', null as unknown as { id: string });

  app.addHook('preHandler', async (request, reply) => {
    if (env.AUTH_MODE === 'dev') {
      request.user = { id: await resolveDevUserId(request) };
      return;
    }

    const pathname = getPathname(request);
    if (isPublicPath(pathname)) {
      request.user = { id: PUBLIC_USER_ID };
      return;
    }

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return unauthorized(reply, 'Missing access token');
    }

    const token = authHeader.slice('Bearer '.length);
    try {
      const { userId } = verifyAccessToken(token);
      request.user = { id: userId };
    } catch {
      return unauthorized(reply, 'Invalid access token');
    }
  });
}
