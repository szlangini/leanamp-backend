import type { FastifyInstance } from 'fastify';
import { badRequest, notFound } from '../../utils/errors';
import {
  CompletionCreateSchema,
  CompletionDeleteParamsSchema,
  CompletionDeleteQuerySchema,
  DayPlanCreateSchema,
  DayPlanUpdateSchema,
  ExtraActivityCreateSchema,
  ExtraActivityQuerySchema,
  ExerciseCreateSchema,
  ExerciseUpdateSchema,
  IdParamSchema,
  TopSetCreateSchema,
  TopSetQuerySchema
} from './schemas';
import {
  createDayPlan,
  createExercise,
  createExtraActivity,
  deleteCompletion,
  deleteDayPlan,
  deleteExercise,
  deleteExtraActivity,
  listExtraActivity,
  listPlan,
  listTopSets,
  resolveRange,
  updateDayPlan,
  updateExercise,
  upsertCompletion,
  upsertTopSet
} from './service';

export default async function trainingRoutes(app: FastifyInstance) {
  app.get('/plan', async (request) => {
    return listPlan(request.user.id);
  });

  app.post('/plan/day', async (request, reply) => {
    const parsed = DayPlanCreateSchema.safeParse(request.body ?? {});

    if (!parsed.success) {
      return badRequest(reply, 'Invalid day plan payload', parsed.error.flatten());
    }

    const day = await createDayPlan(request.user.id, parsed.data);
    return reply.send(day);
  });

  app.patch('/plan/day/:id', async (request, reply) => {
    const paramsParsed = IdParamSchema.safeParse(request.params ?? {});
    const bodyParsed = DayPlanUpdateSchema.safeParse(request.body ?? {});

    if (!paramsParsed.success) {
      return badRequest(reply, 'Invalid day plan id', paramsParsed.error.flatten());
    }

    if (!bodyParsed.success) {
      return badRequest(reply, 'Invalid day plan payload', bodyParsed.error.flatten());
    }

    const day = await updateDayPlan(request.user.id, paramsParsed.data.id, bodyParsed.data);

    if (!day) {
      return notFound(reply, 'Day plan not found');
    }

    return reply.send(day);
  });

  app.delete('/plan/day/:id', async (request, reply) => {
    const paramsParsed = IdParamSchema.safeParse(request.params ?? {});

    if (!paramsParsed.success) {
      return badRequest(reply, 'Invalid day plan id', paramsParsed.error.flatten());
    }

    const deleted = await deleteDayPlan(request.user.id, paramsParsed.data.id);

    if (!deleted) {
      return notFound(reply, 'Day plan not found');
    }

    return reply.status(204).send();
  });

  app.post('/plan/exercise', async (request, reply) => {
    const parsed = ExerciseCreateSchema.safeParse(request.body ?? {});

    if (!parsed.success) {
      return badRequest(reply, 'Invalid exercise payload', parsed.error.flatten());
    }

    const exercise = await createExercise(request.user.id, parsed.data);

    if (!exercise) {
      return notFound(reply, 'Day plan not found');
    }

    return reply.send(exercise);
  });

  app.patch('/plan/exercise/:id', async (request, reply) => {
    const paramsParsed = IdParamSchema.safeParse(request.params ?? {});
    const bodyParsed = ExerciseUpdateSchema.safeParse(request.body ?? {});

    if (!paramsParsed.success) {
      return badRequest(reply, 'Invalid exercise id', paramsParsed.error.flatten());
    }

    if (!bodyParsed.success) {
      return badRequest(reply, 'Invalid exercise payload', bodyParsed.error.flatten());
    }

    const exercise = await updateExercise(
      request.user.id,
      paramsParsed.data.id,
      bodyParsed.data
    );

    if (!exercise) {
      return notFound(reply, 'Exercise not found');
    }

    return reply.send(exercise);
  });

  app.delete('/plan/exercise/:id', async (request, reply) => {
    const paramsParsed = IdParamSchema.safeParse(request.params ?? {});

    if (!paramsParsed.success) {
      return badRequest(reply, 'Invalid exercise id', paramsParsed.error.flatten());
    }

    const deleted = await deleteExercise(request.user.id, paramsParsed.data.id);

    if (!deleted) {
      return notFound(reply, 'Exercise not found');
    }

    return reply.status(204).send();
  });

  app.post('/topsets', async (request, reply) => {
    const parsed = TopSetCreateSchema.safeParse(request.body ?? {});

    if (!parsed.success) {
      return badRequest(reply, 'Invalid top set payload', parsed.error.flatten());
    }

    const entry = await upsertTopSet(request.user.id, parsed.data);

    if (!entry) {
      return notFound(reply, 'Day plan or exercise not found');
    }

    return reply.send(entry);
  });

  app.get('/topsets', async (request, reply) => {
    const parsed = TopSetQuerySchema.safeParse(request.query ?? {});

    if (!parsed.success) {
      return badRequest(reply, 'Invalid top set query', parsed.error.flatten());
    }

    let from: Date;
    let to: Date;

    if (parsed.data.range) {
      const range = resolveRange(parsed.data.range);
      from = range.from;
      to = range.to;
    } else {
      from = new Date(parsed.data.from as string);
      to = new Date(parsed.data.to as string);
    }

    const entries = await listTopSets(request.user.id, from, to);
    return reply.send(entries);
  });

  app.post('/completions', async (request, reply) => {
    const parsed = CompletionCreateSchema.safeParse(request.body ?? {});

    if (!parsed.success) {
      return badRequest(reply, 'Invalid completion payload', parsed.error.flatten());
    }

    const completion = await upsertCompletion(request.user.id, parsed.data);

    if (!completion) {
      return notFound(reply, 'Day plan not found');
    }

    return reply.send(completion);
  });

  app.delete('/completions/:dateISO', async (request, reply) => {
    const paramsParsed = CompletionDeleteParamsSchema.safeParse(request.params ?? {});
    const queryParsed = CompletionDeleteQuerySchema.safeParse(request.query ?? {});

    if (!paramsParsed.success) {
      return badRequest(reply, 'Invalid completion date', paramsParsed.error.flatten());
    }

    if (!queryParsed.success) {
      return badRequest(reply, 'Invalid completion query', queryParsed.error.flatten());
    }

    const deleted = await deleteCompletion(
      request.user.id,
      paramsParsed.data.dateISO,
      queryParsed.data.dayId
    );

    if (!deleted) {
      return notFound(reply, 'Completion not found');
    }

    return reply.status(204).send();
  });

  app.post('/extra-activity', async (request, reply) => {
    const parsed = ExtraActivityCreateSchema.safeParse(request.body ?? {});

    if (!parsed.success) {
      return badRequest(reply, 'Invalid extra activity payload', parsed.error.flatten());
    }

    const activity = await createExtraActivity(request.user.id, parsed.data);
    return reply.send(activity);
  });

  app.get('/extra-activity', async (request, reply) => {
    const parsed = ExtraActivityQuerySchema.safeParse(request.query ?? {});

    if (!parsed.success) {
      return badRequest(reply, 'Invalid extra activity query', parsed.error.flatten());
    }

    const activity = await listExtraActivity(request.user.id, parsed.data.date);
    return reply.send(activity);
  });

  app.delete('/extra-activity/:id', async (request, reply) => {
    const paramsParsed = IdParamSchema.safeParse(request.params ?? {});

    if (!paramsParsed.success) {
      return badRequest(reply, 'Invalid extra activity id', paramsParsed.error.flatten());
    }

    const deleted = await deleteExtraActivity(request.user.id, paramsParsed.data.id);

    if (!deleted) {
      return notFound(reply, 'Extra activity not found');
    }

    return reply.status(204).send();
  });
}
