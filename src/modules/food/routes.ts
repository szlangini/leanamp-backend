import type { FastifyInstance } from 'fastify';
import { badRequest, notFound } from '../../utils/errors';
import {
  FoodEntriesQuerySchema,
  FoodEntryCreateSchema,
  FoodEntryUpdateSchema,
  FoodTemplateCreateSchema,
  IdParamSchema,
  MealGroupCreateSchema,
  MealGroupQuerySchema,
  MealGroupUpdateSchema
} from './schemas';
import {
  createFoodEntry,
  createFoodTemplate,
  createMealGroup,
  deleteFoodEntry,
  deleteFoodTemplate,
  listFoodEntries,
  listMealGroups,
  listFoodTemplates,
  mealGroupExists,
  updateFoodEntry,
  updateMealGroup
} from './service';

export default async function foodRoutes(app: FastifyInstance) {
  app.get('/templates', async (request) => {
    return listFoodTemplates(request.user.id);
  });

  app.post('/templates', async (request, reply) => {
    const parsed = FoodTemplateCreateSchema.safeParse(request.body ?? {});

    if (!parsed.success) {
      return badRequest(reply, 'Invalid food template payload', parsed.error.flatten());
    }

    const template = await createFoodTemplate(request.user.id, parsed.data);
    return reply.send(template);
  });

  app.delete('/templates/:id', async (request, reply) => {
    const parsed = IdParamSchema.safeParse(request.params ?? {});

    if (!parsed.success) {
      return badRequest(reply, 'Invalid template id', parsed.error.flatten());
    }

    const deleted = await deleteFoodTemplate(request.user.id, parsed.data.id);

    if (!deleted) {
      return notFound(reply, 'Food template not found');
    }

    return reply.status(204).send();
  });

  app.post('/meal-groups', async (request, reply) => {
    const parsed = MealGroupCreateSchema.safeParse(request.body ?? {});

    if (!parsed.success) {
      return badRequest(reply, 'Invalid meal group payload', parsed.error.flatten());
    }

    const group = await createMealGroup(request.user.id, parsed.data);
    return reply.send(group);
  });

  app.get('/meal-groups', async (request, reply) => {
    const parsed = MealGroupQuerySchema.safeParse(request.query ?? {});

    if (!parsed.success) {
      return badRequest(reply, 'Invalid meal group query', parsed.error.flatten());
    }

    const groups = await listMealGroups(request.user.id, parsed.data.date);
    return reply.send(groups);
  });

  app.patch('/meal-groups/:id', async (request, reply) => {
    const paramsParsed = IdParamSchema.safeParse(request.params ?? {});
    const bodyParsed = MealGroupUpdateSchema.safeParse(request.body ?? {});

    if (!paramsParsed.success) {
      return badRequest(reply, 'Invalid meal group id', paramsParsed.error.flatten());
    }

    if (!bodyParsed.success) {
      return badRequest(reply, 'Invalid meal group payload', bodyParsed.error.flatten());
    }

    const group = await updateMealGroup(request.user.id, paramsParsed.data.id, bodyParsed.data);

    if (!group) {
      return notFound(reply, 'Meal group not found');
    }

    return reply.send(group);
  });

  app.get('/entries', async (request, reply) => {
    const parsed = FoodEntriesQuerySchema.safeParse(request.query ?? {});

    if (!parsed.success) {
      return badRequest(reply, 'Invalid date query', parsed.error.flatten());
    }

    const entries = await listFoodEntries(request.user.id, parsed.data.date);
    return reply.send(entries);
  });

  app.post('/entries', async (request, reply) => {
    const parsed = FoodEntryCreateSchema.safeParse(request.body ?? {});

    if (!parsed.success) {
      return badRequest(reply, 'Invalid food entry payload', parsed.error.flatten());
    }

    if (parsed.data.groupId) {
      const groupExists = await mealGroupExists(request.user.id, parsed.data.groupId);
      if (!groupExists) {
        return notFound(reply, 'Meal group not found');
      }
    }

    const entry = await createFoodEntry(request.user.id, parsed.data);
    return reply.send(entry);
  });

  app.patch('/entries/:id', async (request, reply) => {
    const paramsParsed = IdParamSchema.safeParse(request.params ?? {});
    const bodyParsed = FoodEntryUpdateSchema.safeParse(request.body ?? {});

    if (!paramsParsed.success) {
      return badRequest(reply, 'Invalid food entry id', paramsParsed.error.flatten());
    }

    if (!bodyParsed.success) {
      return badRequest(reply, 'Invalid food entry payload', bodyParsed.error.flatten());
    }

    if (bodyParsed.data.groupId) {
      const groupExists = await mealGroupExists(request.user.id, bodyParsed.data.groupId);
      if (!groupExists) {
        return notFound(reply, 'Meal group not found');
      }
    }

    const entry = await updateFoodEntry(request.user.id, paramsParsed.data.id, bodyParsed.data);

    if (!entry) {
      return notFound(reply, 'Food entry not found');
    }

    return reply.send(entry);
  });

  app.delete('/entries/:id', async (request, reply) => {
    const parsed = IdParamSchema.safeParse(request.params ?? {});

    if (!parsed.success) {
      return badRequest(reply, 'Invalid food entry id', parsed.error.flatten());
    }

    const deleted = await deleteFoodEntry(request.user.id, parsed.data.id);

    if (!deleted) {
      return notFound(reply, 'Food entry not found');
    }

    return reply.status(204).send();
  });
}
