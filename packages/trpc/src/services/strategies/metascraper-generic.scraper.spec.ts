import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScraperUtilsService } from '../scraper-utils.service';
import { MetascraperGenericStrategy } from './metascraper-generic.scraper';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFetch(html: string, status = 200) {
  const bytes = new TextEncoder().encode(html);
  let consumed = false;
  const reader = {
    read: vi.fn().mockImplementation(() => {
      if (!consumed) {
        consumed = true;
        return Promise.resolve({ done: false, value: bytes });
      }
      return Promise.resolve({ done: true, value: undefined });
    }),
    cancel: vi.fn().mockResolvedValue(undefined),
  };
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      body: { getReader: () => reader },
    }),
  );
}

function mockFetchError(error = new Error('Network error')) {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MetascraperGenericStrategy', () => {
  let strategy: MetascraperGenericStrategy;

  beforeEach(() => {
    strategy = new MetascraperGenericStrategy(new ScraperUtilsService());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('canHandle', () => {
    it('always returns true (fallback strategy)', () => {
      expect(strategy.canHandle('https://example.com')).toBe(true);
      expect(strategy.canHandle('https://any-site.io/path')).toBe(true);
    });
  });

  describe('scrape — field extraction', () => {
    it('extracts title from og:title', async () => {
      mockFetch(`<html><head><meta property="og:title" content="OG Title" /></head></html>`);
      const { title } = await strategy.scrape('https://example.com');
      expect(title).toBe('OG Title');
    });

    it('extracts description from og:description', async () => {
      mockFetch(
        `<html><head><meta property="og:description" content="Some description" /></head></html>`,
      );
      const { description } = await strategy.scrape('https://example.com');
      expect(description).toBe('Some description');
    });

    it('extracts imageUrl from og:image', async () => {
      mockFetch(
        `<html><head><meta property="og:image" content="https://example.com/img.jpg" /></head></html>`,
      );
      const { imageUrl } = await strategy.scrape('https://example.com');
      expect(imageUrl).toBe('https://example.com/img.jpg');
    });

    it('extracts siteName from og:site_name', async () => {
      mockFetch(`<html><head><meta property="og:site_name" content="My Site" /></head></html>`);
      const { siteName } = await strategy.scrape('https://example.com');
      expect(siteName).toBe('My Site');
    });

    it('extracts author from meta name="author"', async () => {
      mockFetch(`<html><head><meta name="author" content="Jane Doe" /></head></html>`);
      const { author } = await strategy.scrape('https://example.com');
      expect(author).toBe('Jane Doe');
    });

    it('type is always article', async () => {
      mockFetch('<html><head><title>Any page</title></head></html>');
      const { type } = await strategy.scrape('https://example.com');
      expect(type).toBe('article');
    });

    it('content is null for pages with no readable body', async () => {
      mockFetch('<html><head><title>Page</title></head></html>');
      const { content } = await strategy.scrape('https://example.com');
      expect(content).toBeNull();
    });

    it('populates content from Readability for an article page', async () => {
      mockFetch(`
        <!DOCTYPE html><html lang="en"><head><title>Article</title></head>
        <body>
          <article>
            <h1>My Article</h1>
            <p>This is a long enough paragraph to be detected as readable content by Readability.</p>
            <p>Another paragraph with more text to satisfy Readability's minimum content threshold.</p>
          </article>
        </body></html>
      `);
      const { content } = await strategy.scrape('https://example.com/article');
      expect(content).not.toBeNull();
      expect(content).toContain('paragraph');
    });
  });

  describe('scrape — error handling', () => {
    it('returns emptyResult on network error', async () => {
      mockFetchError(new Error('ECONNREFUSED'));
      const result = await strategy.scrape('https://example.com');
      expect(result).toMatchObject({
        title: null,
        description: null,
        imageUrl: null,
        author: null,
        siteName: null,
        content: null,
        type: 'article',
      });
    });

    it('returns emptyResult on non-OK response (404)', async () => {
      mockFetch('Not Found', 404);
      const result = await strategy.scrape('https://example.com');
      expect(result.title).toBeNull();
    });

    it('still returns type article even on network error', async () => {
      mockFetchError();
      const { type } = await strategy.scrape('https://example.com');
      expect(type).toBe('article');
    });
  });

  describe('scrape — full page', () => {
    it('extracts all fields from a realistic HTML page', async () => {
      mockFetch(`
        <!DOCTYPE html><html lang="en"><head>
          <meta property="og:title" content="Vector Databases Explained" />
          <meta property="og:description" content="How vector DBs work." />
          <meta property="og:image" content="https://example.com/og.png" />
          <meta property="og:site_name" content="Dev Blog" />
          <meta name="author" content="Alice Smith" />
        </head><body>
          <article>
            <h1>Vector Databases Explained</h1>
            <p>A vector database stores high-dimensional embeddings and enables fast similarity search.</p>
            <p>This paragraph adds enough content for Readability to extract the article body successfully.</p>
          </article>
        </body></html>
      `);
      const result = await strategy.scrape('https://example.com/post');
      expect(result.title).toBe('Vector Databases Explained');
      expect(result.description).toBe('How vector DBs work.');
      expect(result.imageUrl).toBe('https://example.com/og.png');
      expect(result.siteName).toBe('Dev Blog');
      expect(result.author).toBe('Alice Smith');
      expect(result.type).toBe('article');
      expect(result.content).not.toBeNull();
    });
  });
});
