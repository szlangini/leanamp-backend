import jwt, { JwtPayload } from 'jsonwebtoken';
import { env } from '../config/env';

type AccessTokenData = {
  userId: string;
};

type RefreshTokenData = {
  userId: string;
  sessionId: string;
};

export function signAccessToken(userId: string): string {
  return jwt.sign(
    { type: 'access' },
    env.JWT_ACCESS_SECRET,
    {
      subject: userId,
      expiresIn: env.JWT_ACCESS_TTL_SECONDS
    }
  );
}

export function signRefreshToken(sessionId: string, userId: string): string {
  return jwt.sign(
    { type: 'refresh', sid: sessionId },
    env.JWT_REFRESH_SECRET,
    {
      subject: userId,
      expiresIn: env.JWT_REFRESH_TTL_SECONDS
    }
  );
}

export function verifyAccessToken(token: string): AccessTokenData {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
  if (decoded.type !== 'access' || typeof decoded.sub !== 'string') {
    throw new Error('Invalid access token');
  }
  return { userId: decoded.sub };
}

export function verifyRefreshToken(token: string): RefreshTokenData {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
  if (
    decoded.type !== 'refresh' ||
    typeof decoded.sub !== 'string' ||
    typeof decoded.sid !== 'string'
  ) {
    throw new Error('Invalid refresh token');
  }
  return { userId: decoded.sub, sessionId: decoded.sid };
}
