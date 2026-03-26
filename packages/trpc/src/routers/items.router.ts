import { z } from 'zod';
import { ItemsService } from '../services/items.service';
import { protectedProcedure, router, scraperProcedure } from '../trpc';

export const itemsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
        inboxOnly: z.boolean().optional(),
        archivedOnly: z.boolean().optional(),
        includeArchived: z.boolean().optional(),
        collectionId: z.string().optional(),
        type: z.enum(['link', 'article', 'video', 'image', 'post', 'document']).optional(),
        sortBy: z.enum(['createdAt', 'title']).default('createdAt'),
        sortDir: z.enum(['asc', 'desc']).optional(),
      }),
    )
    .query(({ ctx, input }) =>
      new ItemsService(ctx.prisma, ctx.scraperService).findAll(ctx.userId, input),
    ),

  create: scraperProcedure
    .input(z.object({ url: z.string().url(), collectionId: z.string().optional() }))
    .mutation(({ ctx, input }) =>
      new ItemsService(ctx.prisma, ctx.scraperService).create(ctx.userId, input, ctx.scrapeQueue),
    ),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        imageUrl: z.string().url().nullable().optional(),
        type: z.enum(['link', 'article', 'video', 'image', 'post', 'document']).optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      new ItemsService(ctx.prisma, ctx.scraperService).update(ctx.userId, input),
    ),

  archive: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) =>
      new ItemsService(ctx.prisma, ctx.scraperService).archive(ctx.userId, input.id),
    ),

  unarchive: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) =>
      new ItemsService(ctx.prisma, ctx.scraperService).unarchive(ctx.userId, input.id),
    ),

  toggleFavorite: protectedProcedure
    .input(z.object({ id: z.string(), isFavorite: z.boolean() }))
    .mutation(({ ctx, input }) =>
      new ItemsService(ctx.prisma, ctx.scraperService).toggleFavorite(
        ctx.userId,
        input.id,
        input.isFavorite,
      ),
    ),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) =>
      new ItemsService(ctx.prisma, ctx.scraperService).delete(ctx.userId, input.id),
    ),

  search: protectedProcedure
    .input(z.object({ query: z.string().min(1).max(100) }))
    .query(({ ctx, input }) =>
      new ItemsService(ctx.prisma, ctx.scraperService).search(ctx.userId, input.query),
    ),

  count: protectedProcedure.query(({ ctx }) =>
    new ItemsService(ctx.prisma, ctx.scraperService).countInbox(ctx.userId),
  ),
});
