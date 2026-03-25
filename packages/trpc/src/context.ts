import type { PrismaClient } from '@hako/db';
import type { ScraperService } from './services/scraper.service';

export type AppRequest = {
  headers: Record<string, string | string[] | undefined>;
  ip: string | null;
};

export type Context = {
  userId: string;
  prisma: PrismaClient;
  scraperService: ScraperService;
  req: AppRequest;
};

export type PublicContext = {
  userId: string | null;
  prisma: PrismaClient;
  scraperService: ScraperService;
  req: AppRequest;
};
