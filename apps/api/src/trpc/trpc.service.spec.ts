import { RateLimiterMemory } from 'rate-limiter-flexible';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { closeTestModule, getTestModule } from '../test/helpers/create-test-module';
import { truncateAll } from '../test/helpers/db';
import { createTestUser } from '../test/helpers/factories';
import { prisma } from '../test/helpers/prisma';
import { getCaller } from '../test/helpers/trpc-caller';
import { TrpcService } from './trpc.service';

function getLimiters(trpc: TrpcService) {
  const s = trpc as unknown as {
    _protectedLimiter: RateLimiterMemory;
    _scraperLimiter: RateLimiterMemory;
    _publicLimiter: RateLimiterMemory;
  };
  return {
    protected: s._protectedLimiter,
    scraper: s._scraperLimiter,
    public: s._publicLimiter,
  };
}

describe('tRPC rate limiting', () => {
  let trpc: TrpcService;

  beforeEach(async () => {
    await truncateAll(prisma);
    const m = await getTestModule();
    trpc = m.get(TrpcService);
    // Reset the public limiter's 'unknown' bucket (all test callers share this key)
    await getLimiters(trpc).public.delete('unknown');
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await closeTestModule();
  });

  describe('protectedProcedure — 120 req/min per userId', () => {
    it('allows a call when quota is available', async () => {
      const user = await createTestUser();
      const caller = await getCaller(user.id);

      await expect(caller.items.list({})).resolves.toBeDefined();
    });

    it('returns TOO_MANY_REQUESTS when the user has exhausted their quota', async () => {
      const user = await createTestUser();
      const caller = await getCaller(user.id);
      await getLimiters(trpc).protected.set(user.id, 120, 60); // 120 consumed = 0 remaining

      await expect(caller.items.list({})).rejects.toMatchObject({
        code: 'TOO_MANY_REQUESTS',
      });
    });

    it('two users have independent rate limit buckets', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      // Exhaust user1's quota
      await getLimiters(trpc).protected.set(user1.id, 120, 60);

      // user2 should be unaffected
      const caller2 = await getCaller(user2.id);
      await expect(caller2.items.list({})).resolves.toBeDefined();
    });
  });

  describe('scraperProcedure — 20 req/min for items.create', () => {
    it('returns TOO_MANY_REQUESTS when the user has exhausted their scraper quota', async () => {
      const user = await createTestUser();
      const caller = await getCaller(user.id);
      await getLimiters(trpc).scraper.set(user.id, 20, 60); // 20 consumed = 0 remaining

      await expect(caller.items.create({ url: 'https://example.com' })).rejects.toMatchObject({
        code: 'TOO_MANY_REQUESTS',
      });
    });

    it('a user rate-limited on scraper can still call other protected procedures', async () => {
      const user = await createTestUser();
      const caller = await getCaller(user.id);
      // Exhaust only the scraper bucket
      await getLimiters(trpc).scraper.set(user.id, 20, 60);

      // items.list uses protectedProcedure — should still work
      await expect(caller.items.list({})).resolves.toBeDefined();
    });

    it('two users have independent scraper buckets', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      await getLimiters(trpc).scraper.set(user1.id, 20, 60);

      const caller2 = await getCaller(user2.id);
      await expect(
        caller2.items.create({ url: 'https://example.com/user2' }),
      ).resolves.toBeDefined();
    });
  });

  describe('publicRateLimitedProcedure — 30 req/min per IP', () => {
    it('allows anonymous calls when quota is available', async () => {
      const caller = await getCaller();

      await expect(caller.collections.byShareToken({ token: 'non-existent' })).resolves.toBeNull();
    });

    it('returns TOO_MANY_REQUESTS when the IP has exhausted its quota', async () => {
      const caller = await getCaller();
      // All test callers have no IP → key is 'unknown'
      await getLimiters(trpc).public.set('unknown', 30, 60); // 30 consumed = 0 remaining

      await expect(caller.collections.byShareToken({ token: 'some-token' })).rejects.toMatchObject({
        code: 'TOO_MANY_REQUESTS',
      });
    });
  });
});
