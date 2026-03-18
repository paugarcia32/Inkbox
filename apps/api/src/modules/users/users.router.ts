import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { TrpcService } from '../../trpc/trpc.service';
import { UsersService } from './users.service';

@Injectable()
export class UsersRouter {
  constructor(
    private readonly trpc: TrpcService,
    private readonly users: UsersService,
  ) {}

  get router() {
    return this.trpc.router({
      updateProfile: this.trpc.protectedProcedure
        .input(z.object({ name: z.string().min(1).max(100) }))
        .mutation(({ ctx, input }) => this.users.updateProfile(ctx.userId, input.name)),

      deleteAccount: this.trpc.protectedProcedure.mutation(({ ctx }) =>
        this.users.deleteAccount(ctx.userId),
      ),
    });
  }
}
