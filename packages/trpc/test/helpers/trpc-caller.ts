import type { RateLimiters } from '../../src/context';
import { appRouter } from '../../src/routers/_app';
import { ScraperUtilsService } from '../../src/services/scraper-utils.service';
import { ScraperService } from '../../src/services/scraper.service';
import { GenericScraperService } from '../../src/services/strategies/generic.scraper';
import { prisma } from './prisma';

type MockReq = { ip: string | null; headers: Record<string, string> };

function createScraperService() {
  const utils = new ScraperUtilsService();
  return new ScraperService([new GenericScraperService(utils)]);
}

export function getCaller(userId?: string, rateLimiters: RateLimiters | null = null) {
  const ctx = {
    userId: userId ?? '',
    prisma,
    scraperService: createScraperService(),
    req: { ip: null, headers: {} } as MockReq,
    rateLimiters,
  };

  return appRouter.createCaller(ctx as Parameters<typeof appRouter.createCaller>[0]);
}
