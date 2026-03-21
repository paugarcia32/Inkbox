import { Injectable } from '@nestjs/common';
import { TRPCError, initTRPC } from '@trpc/server';
import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';

type AppRequest = {
  headers: Record<string, string | string[] | undefined>;
  userId?: string;
  ip: string | undefined;
};

type Context = {
  userId: string;
  req: AppRequest;
};

type PublicContext = {
  userId: string | null;
  req: AppRequest;
};

const t = initTRPC.context<Context>().create();
const tPublic = initTRPC.context<PublicContext>().create();

@Injectable()
export class TrpcService {
  router = t.router;
  mergeRouters = t.mergeRouters;

  private readonly _protectedLimiter = new RateLimiterMemory({
    points: 120,
    duration: 60,
  });

  private readonly _scraperLimiter = new RateLimiterMemory({
    points: 20,
    duration: 60,
  });

  private readonly _publicLimiter = new RateLimiterMemory({
    points: 30,
    duration: 60,
  });

  publicProcedure = tPublic.procedure;

  protectedProcedure = t.procedure
    .use(({ ctx, next }) => {
      if (!ctx.userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }
      return next({ ctx: { ...ctx, userId: ctx.userId } });
    })
    .use(async ({ ctx, next }) => {
      try {
        await this._protectedLimiter.consume(ctx.userId);
      } catch (e) {
        if (e instanceof RateLimiterRes) {
          throw new TRPCError({ code: 'TOO_MANY_REQUESTS' });
        }
        throw e;
      }
      return next({ ctx });
    });

  scraperProcedure = this.protectedProcedure.use(async ({ ctx, next }) => {
    try {
      await this._scraperLimiter.consume(ctx.userId);
    } catch (e) {
      if (e instanceof RateLimiterRes) {
        throw new TRPCError({ code: 'TOO_MANY_REQUESTS' });
      }
      throw e;
    }
    return next({ ctx });
  });

  publicRateLimitedProcedure = tPublic.procedure.use(async ({ ctx, next }) => {
    const key = ctx.req.ip ?? 'unknown';
    try {
      await this._publicLimiter.consume(key);
    } catch (e) {
      if (e instanceof RateLimiterRes) {
        throw new TRPCError({ code: 'TOO_MANY_REQUESTS' });
      }
      throw e;
    }
    return next({ ctx });
  });
}

export type AppRouter = ReturnType<TrpcService['router']>;
