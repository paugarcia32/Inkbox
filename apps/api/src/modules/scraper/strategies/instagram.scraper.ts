import type { ContentType } from '@hako/types';
import { Injectable, Logger } from '@nestjs/common';
import type { IScraper, ScrapeResult } from '../interfaces/scraper.interface';
import { emptyResult } from '../interfaces/scraper.interface';
import { ScraperUtilsService } from '../scraper-utils.service';

@Injectable()
export class InstagramScraperService implements IScraper {
  private readonly logger = new Logger(InstagramScraperService.name);

  constructor(private readonly utils: ScraperUtilsService) {}

  canHandle(url: string): boolean {
    return url.includes('instagram.com');
  }

  async scrape(url: string): Promise<ScrapeResult> {
    const type = this.detectType(url);

    // Instagram serves og: meta tags to crawlers for link previews without
    // requiring JavaScript rendering or authentication.
    try {
      const html = await this.utils.fetchHtml(url);
      if (!html) return emptyResult(type);

      const rawTitle =
        this.utils.extractMeta(html, 'og:title') ||
        this.utils.extractMeta(html, 'twitter:title') ||
        this.utils.extractTitle(html);

      const title = this.utils.sanitize(rawTitle);

      // Instagram og:title format: "username on Instagram: \"caption\""
      // Extract the username as author from this known pattern.
      const author = this.extractAuthor(rawTitle);

      const description = this.utils.sanitize(
        this.utils.extractMeta(html, 'og:description') ||
          this.utils.extractMeta(html, 'twitter:description') ||
          this.utils.extractMeta(html, 'description'),
      );

      const imageUrl = this.utils.sanitize(
        this.utils.extractMeta(html, 'og:image') || this.utils.extractMeta(html, 'twitter:image'),
      );

      return {
        title,
        description,
        imageUrl,
        content: null,
        author,
        siteName: 'Instagram',
        type,
      };
    } catch (err) {
      this.logger.warn(`Instagram scrape failed for ${url}: ${String(err)}`);
      return emptyResult(type);
    }
  }

  detectType(url: string): ContentType {
    if (url.includes('/reel/') || url.includes('/tv/')) return 'video';
    if (url.includes('/p/')) return 'image';
    return 'link';
  }

  private extractAuthor(rawTitle: string | null | undefined): string | null {
    if (!rawTitle) return null;
    const match = /^(.+?)\s+on\s+Instagram/i.exec(rawTitle);
    return match ? this.utils.sanitize(match[1]) : null;
  }
}
