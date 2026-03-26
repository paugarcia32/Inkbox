import type { PrismaClient } from '@hako/db';
import type { RateLimiterAbstract } from 'rate-limiter-flexible';
import type { ScraperService } from './services/scraper.service';

export type AppRequest = {
  headers: Record<string, string | string[] | undefined>;
  ip: string | null;
};

export type RateLimiters = {
  protected: RateLimiterAbstract;
  scraper: RateLimiterAbstract;
  public: RateLimiterAbstract;
};

export type Context = {
  userId: string;
  prisma: PrismaClient;
  scraperService: ScraperService;
  req: AppRequest;
  rateLimiters: RateLimiters;
};

export type PublicContext = {
  userId: string | null;
  prisma: PrismaClient;
  scraperService: ScraperService;
  req: AppRequest;
  rateLimiters: RateLimiters | null;
};
