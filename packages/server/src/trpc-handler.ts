import { appRouter } from '@hako/trpc';
import { trpcServer } from '@hono/trpc-server';
import { RateLimiterMemory, RateLimiterRedis } from 'rate-limiter-flexible';
import { auth } from './auth.js';
import { prisma } from './db.js';
import { redis } from './redis.js';
import { scraperService } from './scraper.js';

function makeRedisLimiter(keyPrefix: string, points: number) {
  return redis
    ? new RateLimiterRedis({ storeClient: redis, points, duration: 60, keyPrefix })
    : new RateLimiterMemory({ points, duration: 60 });
}

const rateLimiters = {
  protected: makeRedisLimiter('rl:protected', 120),
  scraper: makeRedisLimiter('rl:scraper', 20),
  public: makeRedisLimiter('rl:public', 30),
};

export const trpcHandler = trpcServer({
  router: appRouter,
  createContext: async (_opts, c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers }).catch(() => null);
    const userId = session?.user?.id ?? '';
    const ip = c.req.header('x-forwarded-for') ?? null;
    const headers: Record<string, string | string[] | undefined> = {};
    c.req.raw.headers.forEach((value, key) => {
      headers[key] = value;
    });
    return { userId, prisma, scraperService, req: { ip, headers }, rateLimiters };
  },
});
