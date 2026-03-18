import type { ContentType } from '@hako/types';

export type ScrapeResult = {
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  content: string | null;
  author: string | null;
  siteName: string | null;
  type: ContentType;
};

export const SCRAPER_STRATEGIES = 'SCRAPER_STRATEGIES';

export interface IScraper {
  canHandle(url: string): boolean;
  scrape(url: string): Promise<ScrapeResult>;
}

export function emptyResult(type: ContentType): ScrapeResult {
  return {
    title: null,
    description: null,
    imageUrl: null,
    content: null,
    author: null,
    siteName: null,
    type,
  };
}
