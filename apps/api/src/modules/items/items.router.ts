import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { TrpcService } from '../../trpc/trpc.service';
import { ItemsService } from './items.service';

@Injectable()
export class ItemsRouter {
  constructor(
    private readonly trpc: TrpcService,
    private readonly items: ItemsService,
  ) {}

  get router() {
    return this.trpc.router({
      list: this.trpc.protectedProcedure
        .input(
          z.object({
            limit: z.number().min(1).max(100).default(50),
            cursor: z.string().optional(),
            inboxOnly: z.boolean().optional(),
            archivedOnly: z.boolean().optional(),
            includeArchived: z.boolean().optional(),
            collectionId: z.string().optional(),
          }),
        )
        .query(({ ctx, input }) => this.items.findAll(ctx.userId, input)),

      create: this.trpc.protectedProcedure
        .input(z.object({ url: z.string().url(), collectionId: z.string().optional() }))
        .mutation(({ ctx, input }) => this.items.create(ctx.userId, input)),

      update: this.trpc.protectedProcedure
        .input(
          z.object({
            id: z.string(),
            title: z.string().nullable().optional(),
            description: z.string().nullable().optional(),
            imageUrl: z.string().url().nullable().optional(),
            type: z.enum(['link', 'article', 'video', 'image', 'post', 'document']).optional(),
          }),
        )
        .mutation(({ ctx, input }) => this.items.update(ctx.userId, input)),

      archive: this.trpc.protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(({ ctx, input }) => this.items.archive(ctx.userId, input.id)),

      unarchive: this.trpc.protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(({ ctx, input }) => this.items.unarchive(ctx.userId, input.id)),

      toggleFavorite: this.trpc.protectedProcedure
        .input(z.object({ id: z.string(), isFavorite: z.boolean() }))
        .mutation(({ ctx, input }) =>
          this.items.toggleFavorite(ctx.userId, input.id, input.isFavorite),
        ),

      delete: this.trpc.protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(({ ctx, input }) => this.items.delete(ctx.userId, input.id)),

      search: this.trpc.protectedProcedure
        .input(z.object({ query: z.string().min(1).max(100) }))
        .query(({ ctx, input }) => this.items.search(ctx.userId, input.query)),

      count: this.trpc.protectedProcedure.query(({ ctx }) => this.items.countInbox(ctx.userId)),
    });
  }
}
