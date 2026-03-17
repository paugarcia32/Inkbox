import type { ContentType } from '@inkbox/types';
import { Injectable, Logger } from '@nestjs/common';

type ScrapeResult = {
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  content: string | null;
  author: string | null;
  siteName: string | null;
  type: ContentType;
};

/** Trims a string and returns null if the result is empty or whitespace-only. */
function sanitize(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);

  async scrape(url: string): Promise<ScrapeResult> {
    const type = this.detectType(url);

    if (type === 'pinterest') {
      return this.scrapePinterest(url);
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; Inkbox/1.0; +https://inkbox.app)',
          Accept: 'text/html,application/xhtml+xml',
        },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return this.empty(type);
      }

      // Read at most 500 KB to avoid downloading huge pages
      const reader = response.body?.getReader();
      if (!reader) return this.empty(type);

      const chunks: Uint8Array[] = [];
      let totalBytes = 0;
      const maxBytes = 500_000;

      while (true) {
        const { done, value } = await reader.read();
        if (done || !value) break;
        chunks.push(value);
        totalBytes += value.byteLength;
        if (totalBytes >= maxBytes) {
          await reader.cancel();
          break;
        }
      }

      const html = new TextDecoder().decode(
        chunks.reduce((acc, chunk) => {
          const merged = new Uint8Array(acc.byteLength + chunk.byteLength);
          merged.set(acc, 0);
          merged.set(chunk, acc.byteLength);
          return merged;
        }, new Uint8Array(0)),
      );

      const title =
        this.extractMeta(html, 'og:title') ||
        this.extractMeta(html, 'twitter:title') ||
        this.extractTitle(html);

      const description =
        this.extractMeta(html, 'og:description') ||
        this.extractMeta(html, 'twitter:description') ||
        this.extractMeta(html, 'description');

      const imageUrl =
        this.extractMeta(html, 'og:image') ||
        this.extractMeta(html, 'twitter:image');

      const siteName = this.extractMeta(html, 'og:site_name');

      return { title: sanitize(title), description: sanitize(description), imageUrl: sanitize(imageUrl), content: null, author: null, siteName: sanitize(siteName), type };
    } catch (err) {
      this.logger.warn(`Failed to scrape ${url}: ${String(err)}`);
      return this.empty(type);
    }
  }

  private empty(type: ContentType): ScrapeResult {
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

  private extractMeta(html: string, name: string): string | null {
    // Handles both property="og:*" and name="*" forms, and both attribute orderings
    const patterns = [
      new RegExp(
        `<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"'<>]+)["']`,
        'i',
      ),
      new RegExp(
        `<meta[^>]+content=["']([^"'<>]+)["'][^>]+(?:property|name)=["']${name}["']`,
        'i',
      ),
    ];
    for (const re of patterns) {
      const m = html.match(re);
      if (m?.[1]) return this.decodeEntities(m[1].trim());
    }
    return null;
  }

  private extractTitle(html: string): string | null {
    const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return m?.[1] ? this.decodeEntities(m[1].trim()) : null;
  }

  private decodeEntities(str: string): string {
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&#(\d+);/g, (_, code: string) =>
        String.fromCharCode(Number(code)),
      );
  }

  private async scrapePinterest(url: string): Promise<ScrapeResult> {
    const type: ContentType = 'pinterest';
    const siteName = 'Pinterest';

    let title: string | null = null;
    let imageUrl: string | null = null;
    let author: string | null = null;

    // Phase 1: oEmbed (primary source)
    try {
      const oEmbedUrl = `https://www.pinterest.com/oembed.json?url=${encodeURIComponent(url)}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      const response = await fetch(oEmbedUrl, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timeout);

      if (response.ok) {
        const data = (await response.json()) as {
          title?: string;
          author_name?: string;
          thumbnail_url?: string;
        };
        title = data.title || null;
        author = data.author_name || null;
        imageUrl = data.thumbnail_url || null;
      }
    } catch (err) {
      this.logger.warn(`Pinterest oEmbed failed for ${url}: ${String(err)}`);
    }

    // Phase 2: HTML fetch for description (best-effort)
    let description: string | null = null;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      clearTimeout(timeout);

      if (response.ok) {
        const reader = response.body?.getReader();
        if (reader) {
          const chunks: Uint8Array[] = [];
          let totalBytes = 0;
          const maxBytes = 500_000;

          while (true) {
            const { done, value } = await reader.read();
            if (done || !value) break;
            chunks.push(value);
            totalBytes += value.byteLength;
            if (totalBytes >= maxBytes) {
              await reader.cancel();
              break;
            }
          }

          const html = new TextDecoder().decode(
            chunks.reduce((acc, chunk) => {
              const merged = new Uint8Array(acc.byteLength + chunk.byteLength);
              merged.set(acc, 0);
              merged.set(chunk, acc.byteLength);
              return merged;
            }, new Uint8Array(0)),
          );

          description =
            this.extractMeta(html, 'og:description') ||
            this.extractMeta(html, 'twitter:description') ||
            this.extractMeta(html, 'description');

          if (!title) {
            title =
              this.extractMeta(html, 'og:title') ||
              this.extractMeta(html, 'twitter:title') ||
              this.extractTitle(html);
          }
        }
      }
    } catch (err) {
      this.logger.warn(`Pinterest HTML fetch failed for ${url}: ${String(err)}`);
    }

    if (!title) {
      try {
        title = new URL(url).hostname.replace(/^www\./, '');
      } catch { /* keep null */ }
    }

    return { title: sanitize(title), description: sanitize(description), imageUrl: sanitize(imageUrl), content: null, author: sanitize(author), siteName, type };
  }

  private detectType(url: string): ContentType {
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'tweet';
    if (url.includes('pinterest.com') || url.includes('pin.it')) return 'pinterest';
    return 'article';
  }
}
