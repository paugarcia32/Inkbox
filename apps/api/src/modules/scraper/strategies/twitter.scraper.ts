import { Injectable, Logger } from '@nestjs/common';
import type { IScraper, ScrapeResult } from '../interfaces/scraper.interface';
import { emptyResult } from '../interfaces/scraper.interface';
import { ScraperUtilsService } from '../scraper-utils.service';

@Injectable()
export class TwitterScraperService implements IScraper {
  private readonly logger = new Logger(TwitterScraperService.name);

  constructor(private readonly utils: ScraperUtilsService) {}

  canHandle(url: string): boolean {
    return url.includes('twitter.com') || url.includes('x.com');
  }

  async scrape(url: string): Promise<ScrapeResult> {
    const siteName = 'X';

    // Extract numeric tweet ID from the URL
    const tweetId = url.match(/\/status\/(\d+)/)?.[1] ?? null;

    // Normalise to twitter.com — oEmbed still uses the old domain
    const twitterUrl = url.replace('x.com', 'twitter.com');

    if (tweetId) {
      // Phase 1: Syndication API — same endpoint Twitter's own embed widget calls.
      // Requires a token derived from the tweet ID (added ~2024).
      // For X Articles __typename will be "Article" (not "Tweet") — we detect that
      // here and fall through to the HTML phase which handles articles properly.
      try {
        const token = this.tweetToken(tweetId);
        const syndicationUrl = `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&lang=en&token=${token}`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10_000);

        const response = await fetch(syndicationUrl, {
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            Referer: 'https://twitter.com/',
            Origin: 'https://twitter.com',
          },
        });
        clearTimeout(timeout);

        this.logger.log(`Twitter syndication status for ${tweetId}: ${response.status}`);

        if (response.ok) {
          const data = (await response.json()) as {
            __typename?: string;
            text?: string;
            user?: { name?: string; screen_name?: string };
            mediaDetails?: Array<{
              type?: string;
              media_url_https?: string;
            }>;
            // X Articles: the tweet is a wrapper; the actual content lives here
            article?: {
              title?: string;
              preview_text?: string;
              cover_media?: {
                media_info?: { original_img_url?: string };
              };
            };
          };

          this.logger.log(
            `Twitter syndication __typename=${data.__typename ?? 'n/a'} keys: ${Object.keys(data).join(', ')}`,
          );

          // If the tweet wraps an X Article, use the article's own metadata
          if (data.article) {
            const title = this.utils.sanitize(data.article.title ?? null);
            const description = this.utils.sanitize(data.article.preview_text ?? null);
            const imageUrl = this.utils.sanitize(
              data.article.cover_media?.media_info?.original_img_url ?? null,
            );
            const author = this.utils.sanitize(data.user?.name ?? data.user?.screen_name ?? null);
            if (title) {
              return {
                title,
                description,
                imageUrl,
                content: null,
                author,
                siteName,
                type: 'article',
              };
            }
          }

          // X Articles surface as a non-Tweet __typename — skip to HTML phase
          if (data.__typename && data.__typename !== 'Tweet') {
            this.logger.log(
              `Detected X Article (non-Tweet __typename) for ${tweetId}, falling through to HTML phase`,
            );
          } else {
            const title = this.utils.sanitize(this.cleanTweetText(data.text ?? ''));
            const author = this.utils.sanitize(data.user?.name ?? data.user?.screen_name ?? null);
            const media = data.mediaDetails?.[0];
            const imageUrl = this.utils.sanitize(media?.media_url_https ?? null);

            if (title) {
              return {
                title,
                description: null,
                imageUrl,
                content: null,
                author,
                siteName,
                type: 'tweet',
              };
            }
          }
        } else {
          this.logger.warn(`Twitter syndication non-ok for ${tweetId}: ${response.status}`);
        }
      } catch (err) {
        this.logger.warn(`Twitter syndication failed for ${url}: ${String(err)}`);
      }

      // Phase 2: oEmbed fallback — official Twitter endpoint, always works for public tweets.
      // Returns an HTML blockquote whose <p> contains the tweet text.
      // Skip for articles (oEmbed returns the article URL tweet, not the article content).
      try {
        const oEmbedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(twitterUrl)}&omit_script=true`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10_000);

        const response = await fetch(oEmbedUrl, {
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          },
        });
        clearTimeout(timeout);

        this.logger.log(`Twitter oEmbed status for ${tweetId}: ${response.status}`);

        if (response.ok) {
          const data = (await response.json()) as {
            html?: string;
            author_name?: string;
          };

          const title = this.utils.sanitize(this.extractOEmbedText(data.html ?? ''));
          const author = this.utils.sanitize(data.author_name ?? null);

          if (title) {
            return {
              title,
              description: null,
              imageUrl: null,
              content: null,
              author,
              siteName,
              type: 'tweet',
            };
          }
        } else {
          this.logger.warn(`Twitter oEmbed non-ok for ${tweetId}: ${response.status}`);
        }
      } catch (err) {
        this.logger.warn(`Twitter oEmbed failed for ${url}: ${String(err)}`);
      }
    }

    // Phase 3: HTML scraping — handles X Articles and any tweet that slipped through.
    // X server-side renders og:* tags for articles (title, description, image, type).
    try {
      const html = await this.utils.fetchHtml(url);
      if (html) {
        const ogType = this.utils.extractMeta(html, 'og:type');
        const isArticle = ogType === 'article';

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

        // Strip the "Name on X: " prefix that X adds to tweet og:titles
        const cleanTitle =
          this.utils
            .sanitize(title)
            ?.replace(/^.+ on X:\s*[""\u201C]/i, '')
            .replace(/[""\u201D]\s*$/, '')
            .trim() ?? null;

        const contentType = isArticle ? ('article' as const) : ('tweet' as const);
        this.logger.log(
          `Twitter HTML phase: og:type=${ogType ?? 'n/a'} → contentType=${contentType}`,
        );

        if (cleanTitle) {
          return {
            title: this.utils.sanitize(cleanTitle),
            description: this.utils.sanitize(description),
            imageUrl: this.utils.sanitize(imageUrl),
            content: null,
            author: null,
            siteName,
            type: contentType,
          };
        }
      }
    } catch (err) {
      this.logger.warn(`Twitter HTML phase failed for ${url}: ${String(err)}`);
    }

    return emptyResult('tweet');
  }

  /**
   * Computes the token required by the Twitter syndication API.
   * Formula: square the tweet ID with the last 9 digits stripped (i.e. the
   * high-order ~10 digits of the snowflake ID).  BigInt prevents precision loss.
   */
  private tweetToken(tweetId: string): string {
    const high = BigInt(tweetId.slice(0, Math.max(1, tweetId.length - 9)));
    return (high * high).toString();
  }

  /** Strips trailing t.co media links and decodes HTML entities from tweet text. */
  private cleanTweetText(text: string): string {
    return this.utils
      .decodeEntities(text)
      .replace(/\s*https:\/\/t\.co\/\S+/g, '')
      .trim();
  }

  /** Extracts plain text from the <p> tag inside an oEmbed blockquote HTML string. */
  private extractOEmbedText(html: string): string | null {
    const m = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    if (!m?.[1]) return null;
    return (
      m[1]
        .replace(/<a[^>]*>https:\/\/t\.co\/\S*<\/a>/gi, '') // remove t.co link elements
        .replace(/<[^>]+>/g, ' ') // strip remaining tags
        .replace(/\s+/g, ' ')
        .trim() || null
    );
  }
}
