import type { FastifyReply } from 'fastify';

type ErrorPayload = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export function sendError(
  reply: FastifyReply,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown
) {
  const payload: ErrorPayload = {
    error: {
      code,
      message,
      ...(details === undefined ? {} : { details })
    }
  };

  return reply.status(statusCode).send(payload);
}

export function badRequest(reply: FastifyReply, message: string, details?: unknown) {
  return sendError(reply, 400, 'bad_request', message, details);
}

export function notFound(reply: FastifyReply, message: string) {
  return sendError(reply, 404, 'not_found', message);
}
