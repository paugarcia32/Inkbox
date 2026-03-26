import { RateLimiterMemory } from 'rate-limiter-flexible';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { truncateAll } from '../test/helpers/db';
import { createTestUser } from '../test/helpers/factories';
import { prisma } from '../test/helpers/prisma';
import { getCaller } from '../test/helpers/trpc-caller';
import type { RateLimiters } from './context';

function makeUnlimitedLimiters(): RateLimiters {
  return {
    protected: new RateLimiterMemory({ points: 9999, duration: 60 }),
    scraper: new RateLimiterMemory({ points: 9999, duration: 60 }),
    public: new RateLimiterMemory({ points: 9999, duration: 60 }),
  };
}

describe('tRPC rate limiting', () => {
  beforeEach(async () => {
    await truncateAll(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('protectedProcedure — 120 req/min per userId', () => {
    it('allows a call when quota is available', async () => {
      const user = await createTestUser();
      const caller = getCaller(user.id, makeUnlimitedLimiters());

      await expect(caller.items.list({})).resolves.toBeDefined();
    });

    it('returns TOO_MANY_REQUESTS when the user has exhausted their quota', async () => {
      const user = await createTestUser();
      const protectedLimiter = new RateLimiterMemory({ points: 120, duration: 60 });
      await protectedLimiter.set(user.id, 120, 60); // 120 consumed = 0 remaining
      const limiters: RateLimiters = {
        protected: protectedLimiter,
        scraper: new RateLimiterMemory({ points: 9999, duration: 60 }),
        public: new RateLimiterMemory({ points: 9999, duration: 60 }),
      };
      const caller = getCaller(user.id, limiters);

      await expect(caller.items.list({})).rejects.toMatchObject({
        code: 'TOO_MANY_REQUESTS',
      });
    });

    it('two users have independent rate limit buckets', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const protectedLimiter = new RateLimiterMemory({ points: 120, duration: 60 });
      await protectedLimiter.set(user1.id, 120, 60);
      const limiters: RateLimiters = {
        protected: protectedLimiter,
        scraper: new RateLimiterMemory({ points: 9999, duration: 60 }),
        public: new RateLimiterMemory({ points: 9999, duration: 60 }),
      };

      await expect(getCaller(user1.id, limiters).items.list({})).rejects.toMatchObject({
        code: 'TOO_MANY_REQUESTS',
      });
      await expect(getCaller(user2.id, limiters).items.list({})).resolves.toBeDefined();
    });
  });

  describe('scraperProcedure — 20 req/min for items.create', () => {
    it('returns TOO_MANY_REQUESTS when the user has exhausted their scraper quota', async () => {
      const user = await createTestUser();
      const scraperLimiter = new RateLimiterMemory({ points: 20, duration: 60 });
      await scraperLimiter.set(user.id, 20, 60); // 20 consumed = 0 remaining
      const limiters: RateLimiters = {
        protected: new RateLimiterMemory({ points: 9999, duration: 60 }),
        scraper: scraperLimiter,
        public: new RateLimiterMemory({ points: 9999, duration: 60 }),
      };
      const caller = getCaller(user.id, limiters);

      await expect(caller.items.create({ url: 'https://example.com' })).rejects.toMatchObject({
        code: 'TOO_MANY_REQUESTS',
      });
    });

    it('a user rate-limited on scraper can still call other protected procedures', async () => {
      const user = await createTestUser();
      const scraperLimiter = new RateLimiterMemory({ points: 20, duration: 60 });
      await scraperLimiter.set(user.id, 20, 60);
      const limiters: RateLimiters = {
        protected: new RateLimiterMemory({ points: 9999, duration: 60 }),
        scraper: scraperLimiter,
        public: new RateLimiterMemory({ points: 9999, duration: 60 }),
      };

      await expect(getCaller(user.id, limiters).items.list({})).resolves.toBeDefined();
    });

    it('two users have independent scraper buckets', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const scraperLimiter = new RateLimiterMemory({ points: 20, duration: 60 });
      await scraperLimiter.set(user1.id, 20, 60);
      const limiters: RateLimiters = {
        protected: new RateLimiterMemory({ points: 9999, duration: 60 }),
        scraper: scraperLimiter,
        public: new RateLimiterMemory({ points: 9999, duration: 60 }),
      };

      await expect(
        getCaller(user2.id, limiters).items.create({ url: 'https://example.com/user2' }),
      ).resolves.toBeDefined();
    });
  });

  describe('publicRateLimitedProcedure — 30 req/min per IP', () => {
    it('allows anonymous calls when quota is available', async () => {
      const caller = getCaller(); // rateLimiters: null → no limiting

      await expect(caller.collections.byShareToken({ token: 'non-existent' })).resolves.toBeNull();
    });

    it('returns TOO_MANY_REQUESTS when the IP has exhausted its quota', async () => {
      const publicLimiter = new RateLimiterMemory({ points: 30, duration: 60 });
      await publicLimiter.set('unknown', 30, 60); // 30 consumed = 0 remaining
      const limiters: RateLimiters = {
        protected: new RateLimiterMemory({ points: 9999, duration: 60 }),
        scraper: new RateLimiterMemory({ points: 9999, duration: 60 }),
        public: publicLimiter,
      };
      const caller = getCaller(undefined, limiters);

      await expect(caller.collections.byShareToken({ token: 'some-token' })).rejects.toMatchObject({
        code: 'TOO_MANY_REQUESTS',
      });
    });
  });

  describe('null rateLimiters — no limiting in tests by default', () => {
    it('protectedProcedure works with rateLimiters: null', async () => {
      const user = await createTestUser();
      const caller = getCaller(user.id); // null limiters
      await expect(caller.items.list({})).resolves.toBeDefined();
    });
  });
});
