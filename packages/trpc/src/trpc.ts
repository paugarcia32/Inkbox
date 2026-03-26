import { TRPCError, initTRPC } from '@trpc/server';
import { RateLimiterRes } from 'rate-limiter-flexible';
import type { Context, PublicContext } from './context';

const t = initTRPC.context<Context>().create();
const tPublic = initTRPC.context<PublicContext>().create();

export const router = t.router;
export const mergeRouters = t.mergeRouters;

export const publicProcedure = tPublic.procedure;

export const protectedProcedure = t.procedure
  .use(({ ctx, next }) => {
    if (!ctx.userId) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }
    return next({ ctx: { ...ctx, userId: ctx.userId } });
  })
  .use(async ({ ctx, next }) => {
    if (ctx.rateLimiters) {
      try {
        await ctx.rateLimiters.protected.consume(ctx.userId);
      } catch (e) {
        if (e instanceof RateLimiterRes) {
          throw new TRPCError({ code: 'TOO_MANY_REQUESTS' });
        }
        throw e;
      }
    }
    return next({ ctx });
  });

export const scraperProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.rateLimiters) {
    try {
      await ctx.rateLimiters.scraper.consume(ctx.userId);
    } catch (e) {
      if (e instanceof RateLimiterRes) {
        throw new TRPCError({ code: 'TOO_MANY_REQUESTS' });
      }
      throw e;
    }
  }
  return next({ ctx });
});

export const publicRateLimitedProcedure = tPublic.procedure.use(async ({ ctx, next }) => {
  const key = ctx.req.ip ?? 'unknown';
  if (ctx.rateLimiters) {
    try {
      await ctx.rateLimiters.public.consume(key);
    } catch (e) {
      if (e instanceof RateLimiterRes) {
        throw new TRPCError({ code: 'TOO_MANY_REQUESTS' });
      }
      throw e;
    }
  }
  return next({ ctx });
});
