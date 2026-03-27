import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import metascraper from 'metascraper';
import metascraperAuthor from 'metascraper-author';
import metascraperDescription from 'metascraper-description';
import metascraperImage from 'metascraper-image';
import metascraperPublisher from 'metascraper-publisher';
import metascraperTitle from 'metascraper-title';
import { Logger } from '../../logger';
import type { ScraperUtilsService } from '../scraper-utils.service';
import { type IScraper, type ScrapeResult, emptyResult } from '../scraper.interface';

const scraper = metascraper([
  metascraperTitle(),
  metascraperDescription(),
  metascraperImage(),
  metascraperAuthor(),
  metascraperPublisher(),
]);

export class MetascraperGenericStrategy implements IScraper {
  private readonly logger = new Logger(MetascraperGenericStrategy.name);

  constructor(private readonly utils: ScraperUtilsService) {}

  canHandle(_url: string): boolean {
    return true; // always last in chain — catch-all fallback
  }

  async scrape(url: string): Promise<ScrapeResult> {
    try {
      const html = await this.utils.fetchHtml(url);
      if (!html) return emptyResult('article');

      const metadata = await scraper({ html, url });

      let content: string | null = null;
      try {
        const dom = new JSDOM(html, { url });
        const article = new Readability(dom.window.document).parse();
        content = article?.content ?? null;
      } catch (err) {
        this.logger.warn(`Readability failed for ${url}: ${String(err)}`);
      }

      return {
        title: metadata.title ?? null,
        description: metadata.description ?? null,
        imageUrl: metadata.image ?? null,
        author: metadata.author ?? null,
        siteName: metadata.publisher ?? null,
        content,
        type: 'article',
      };
    } catch (err) {
      this.logger.warn(`MetascraperGenericStrategy failed for ${url}: ${String(err)}`);
      return emptyResult('article');
    }
  }
}
