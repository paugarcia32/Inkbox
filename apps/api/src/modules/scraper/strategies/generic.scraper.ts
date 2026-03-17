import type { ContentType } from '@inkbox/types';
import { Injectable, Logger } from '@nestjs/common';
import type { IScraper, ScrapeResult } from '../interfaces/scraper.interface';
import { emptyResult } from '../interfaces/scraper.interface';
import { ScraperUtilsService } from '../scraper-utils.service';

@Injectable()
export class GenericScraperService implements IScraper {
  private readonly logger = new Logger(GenericScraperService.name);

  constructor(private readonly utils: ScraperUtilsService) {}

  /** Always handles — this is the fallback strategy. */
  canHandle(_url: string): boolean {
    return true;
  }

  async scrape(url: string): Promise<ScrapeResult> {
    const type = this.detectType(url);

    try {
      const html = await this.utils.fetchHtml(url);
      if (!html) return emptyResult(type);

      const title =
        this.utils.extractMeta(html, 'og:title') ||
        this.utils.extractMeta(html, 'twitter:title') ||
        this.utils.extractTitle(html);

      const description =
        this.utils.extractMeta(html, 'og:description') ||
        this.utils.extractMeta(html, 'twitter:description') ||
        this.utils.extractMeta(html, 'description');

      const imageUrl =
        this.utils.extractMeta(html, 'og:image') || this.utils.extractMeta(html, 'twitter:image');

      const siteName = this.utils.extractMeta(html, 'og:site_name');

      return {
        title: this.utils.sanitize(title),
        description: this.utils.sanitize(description),
        imageUrl: this.utils.sanitize(imageUrl),
        content: null,
        author: null,
        siteName: this.utils.sanitize(siteName),
        type,
      };
    } catch (err) {
      this.logger.warn(`Failed to scrape ${url}: ${String(err)}`);
      return emptyResult(type);
    }
  }

  detectType(url: string): ContentType {
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    return 'article';
  }
}
