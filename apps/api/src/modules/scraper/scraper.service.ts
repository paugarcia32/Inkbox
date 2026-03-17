import { Inject, Injectable } from '@nestjs/common';
import type { IScraper, ScrapeResult } from './interfaces/scraper.interface';
import { SCRAPER_STRATEGIES } from './interfaces/scraper.interface';

export type { ScrapeResult };

@Injectable()
export class ScraperService {
  constructor(
    @Inject(SCRAPER_STRATEGIES)
    private readonly strategies: IScraper[],
  ) {}

  async scrape(url: string): Promise<ScrapeResult> {
    // Strategies are ordered: specific ones first (Twitter, Pinterest), Generic last.
    // GenericScraperService.canHandle() always returns true so it acts as the fallback.
    // GenericScraperService.canHandle() always returns true, so this is always defined.
    const strategy = this.strategies.find((s) => s.canHandle(url));
    if (!strategy) throw new Error(`No scraper strategy found for: ${url}`);
    return strategy.scrape(url);
  }
}
