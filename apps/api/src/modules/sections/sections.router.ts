import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { TrpcService } from '../../trpc/trpc.service';
import { SectionsService } from './sections.service';

@Injectable()
export class SectionsRouter {
  constructor(
    private readonly trpc: TrpcService,
    private readonly sections: SectionsService,
  ) {}

  get router() {
    return this.trpc.router({
      list: this.trpc.protectedProcedure
        .input(z.object({ collectionId: z.string() }))
        .query(({ ctx, input }) => this.sections.findAll(ctx.userId, input.collectionId)),

      create: this.trpc.protectedProcedure
        .input(z.object({ collectionId: z.string(), name: z.string().min(1).max(100) }))
        .mutation(({ ctx, input }) =>
          this.sections.create(ctx.userId, input.collectionId, input.name),
        ),

      update: this.trpc.protectedProcedure
        .input(
          z.object({
            id: z.string(),
            name: z.string().min(1).max(100).optional(),
            order: z.number().int().min(0).optional(),
          }),
        )
        .mutation(({ ctx, input }) =>
          this.sections.update(ctx.userId, input.id, { name: input.name, order: input.order }),
        ),

      delete: this.trpc.protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(({ ctx, input }) => this.sections.delete(ctx.userId, input.id)),

      assignItem: this.trpc.protectedProcedure
        .input(
          z.object({
            collectionId: z.string(),
            itemId: z.string(),
            sectionId: z.string().nullable(),
          }),
        )
        .mutation(({ ctx, input }) =>
          this.sections.assignItem(ctx.userId, input.collectionId, input.itemId, input.sectionId),
        ),

      reorder: this.trpc.protectedProcedure
        .input(z.object({ collectionId: z.string(), orderedIds: z.array(z.string()) }))
        .mutation(({ ctx, input }) =>
          this.sections.reorder(ctx.userId, input.collectionId, input.orderedIds),
        ),
    });
  }
}
