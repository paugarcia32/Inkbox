import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScraperUtilsService } from '../scraper-utils.service';
import { TwitterScraperService } from './twitter.scraper';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFetchSequence(
  ...responses: Array<{ body: string; status?: number; isJson?: boolean }>
) {
  let callIndex = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(() => {
      const config = responses[callIndex] ??
        responses[responses.length - 1] ?? { body: '', status: 200 };
      callIndex++;
      const status = config.status ?? 200;
      const ok = status >= 200 && status < 300;

      if (config.isJson) {
        return Promise.resolve({
          ok,
          status,
          body: null,
          json: vi.fn().mockResolvedValue(JSON.parse(config.body)),
        });
      }

      const bytes = new TextEncoder().encode(config.body);
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
      return Promise.resolve({
        ok,
        status,
        body: { getReader: () => reader },
        json: vi.fn().mockResolvedValue({}),
      });
    }),
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TwitterScraperService', () => {
  let service: TwitterScraperService;

  beforeEach(() => {
    service = new TwitterScraperService(new ScraperUtilsService());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ── canHandle ─────────────────────────────────────────────────────────────

  describe('canHandle', () => {
    it('returns true for twitter.com', () => {
      expect(service.canHandle('https://twitter.com/user/status/123')).toBe(true);
    });

    it('returns true for x.com', () => {
      expect(service.canHandle('https://x.com/user/status/123')).toBe(true);
    });

    it('returns false for other domains', () => {
      expect(service.canHandle('https://example.com')).toBe(false);
      expect(service.canHandle('https://youtube.com/watch?v=abc')).toBe(false);
      expect(service.canHandle('https://pinterest.com/pin/123')).toBe(false);
    });
  });

  // ── Syndication API (Phase 1) ─────────────────────────────────────────────

  describe('syndication API', () => {
    it('extracts title, author and imageUrl from a regular tweet', async () => {
      mockFetchSequence({
        body: JSON.stringify({
          __typename: 'Tweet',
          text: 'Hello world https://t.co/abc123',
          user: { name: 'Test User', screen_name: 'testuser' },
          mediaDetails: [
            { type: 'photo', media_url_https: 'https://pbs.twimg.com/media/photo.jpg' },
          ],
        }),
        isJson: true,
      });

      const result = await service.scrape('https://x.com/testuser/status/1234567890');
      expect(result.title).toBe('Hello world');
      expect(result.author).toBe('Test User');
      expect(result.imageUrl).toBe('https://pbs.twimg.com/media/photo.jpg');
      expect(result.type).toBe('tweet');
      expect(result.siteName).toBe('X');
    });

    it('strips trailing t.co link from tweet text', async () => {
      mockFetchSequence({
        body: JSON.stringify({
          __typename: 'Tweet',
          text: 'Check this out https://t.co/xyz123',
          user: { name: 'User' },
        }),
        isJson: true,
      });

      const { title } = await service.scrape('https://x.com/user/status/1111111111');
      expect(title).toBe('Check this out');
    });

    it('extracts X Article data from data.article field', async () => {
      mockFetchSequence({
        body: JSON.stringify({
          __typename: 'Tweet',
          user: { name: 'Article Author', screen_name: 'author' },
          article: {
            title: 'My Article Title',
            preview_text: 'Article preview text here',
            cover_media: { media_info: { original_img_url: 'https://pbs.twimg.com/cover.jpg' } },
          },
        }),
        isJson: true,
      });

      const result = await service.scrape('https://x.com/author/status/4444444444');
      expect(result.title).toBe('My Article Title');
      expect(result.description).toBe('Article preview text here');
      expect(result.imageUrl).toBe('https://pbs.twimg.com/cover.jpg');
      expect(result.author).toBe('Article Author');
      expect(result.type).toBe('article');
      expect(result.siteName).toBe('X');
    });

    it('X Article without cover media returns null imageUrl', async () => {
      mockFetchSequence({
        body: JSON.stringify({
          __typename: 'Tweet',
          user: { name: 'Author' },
          article: { title: 'Article Without Image', preview_text: 'Some preview' },
        }),
        isJson: true,
      });

      const { imageUrl, title, type } = await service.scrape(
        'https://x.com/user/status/5555555555',
      );
      expect(title).toBe('Article Without Image');
      expect(imageUrl).toBeNull();
      expect(type).toBe('article');
    });

    it('handles twitter.com URLs the same as x.com', async () => {
      mockFetchSequence({
        body: JSON.stringify({
          __typename: 'Tweet',
          text: 'Tweet from twitter.com domain',
          user: { name: 'TwitterUser' },
        }),
        isJson: true,
      });

      const { title, type } = await service.scrape('https://twitter.com/user/status/1234500000');
      expect(title).toBe('Tweet from twitter.com domain');
      expect(type).toBe('tweet');
    });
  });

  // ── oEmbed fallback (Phase 2) ─────────────────────────────────────────────

  describe('oEmbed fallback', () => {
    it('falls through to oEmbed when tweet text is only a t.co link', async () => {
      mockFetchSequence(
        {
          body: JSON.stringify({
            __typename: 'Tweet',
            text: 'https://t.co/onlylinkhere',
            user: { name: 'User' },
          }),
          isJson: true,
        },
        {
          body: JSON.stringify({
            html: '<blockquote><p>Tweet text from oEmbed <a href="https://t.co/link">https://t.co/link</a></p></blockquote>',
            author_name: 'oEmbed Author',
          }),
          isJson: true,
        },
      );

      const { title, author, type } = await service.scrape('https://x.com/user/status/2222222222');
      expect(title).toBe('Tweet text from oEmbed');
      expect(author).toBe('oEmbed Author');
      expect(type).toBe('tweet');
    });

    it('strips <a> t.co elements and remaining HTML tags from oEmbed', async () => {
      mockFetchSequence(
        {
          body: JSON.stringify({
            __typename: 'Tweet',
            text: 'https://t.co/x',
            user: { name: 'U' },
          }),
          isJson: true,
        },
        {
          body: JSON.stringify({
            html: '<blockquote><p>Real content <b>bold</b> <a href="https://t.co/x">https://t.co/x</a></p></blockquote>',
            author_name: 'Author',
          }),
          isJson: true,
        },
      );

      const { title } = await service.scrape('https://x.com/user/status/3333333333');
      expect(title).toBe('Real content bold');
    });
  });

  // ── HTML phase (Phase 3) ──────────────────────────────────────────────────

  describe('HTML phase', () => {
    it('strips "Name on X:" prefix from og:title', async () => {
      mockFetchSequence(
        {
          body: JSON.stringify({
            __typename: 'Tweet',
            text: 'https://t.co/x',
            user: { name: 'U' },
          }),
          isJson: true,
        },
        { body: JSON.stringify({ html: '', author_name: 'U' }), isJson: true },
        { body: '<meta property="og:title" content="John on X: \u201CHello world\u201D" />' },
      );

      const { title } = await service.scrape('https://x.com/john/status/6666666666');
      expect(title).toBe('Hello world');
    });

    it('returns type=article when og:type is article', async () => {
      mockFetchSequence(
        {
          body: JSON.stringify({
            __typename: 'Tweet',
            text: 'https://t.co/x',
            user: { name: 'U' },
          }),
          isJson: true,
        },
        { body: JSON.stringify({ html: '', author_name: 'U' }), isJson: true },
        {
          body: '<meta property="og:type" content="article" /><meta property="og:title" content="Long Article Title" />',
        },
      );

      const { type } = await service.scrape('https://x.com/user/status/7777777777');
      expect(type).toBe('article');
    });
  });

  // ── Error handling ────────────────────────────────────────────────────────

  describe('error handling', () => {
    it('returns nulls with type=tweet when all phases fail', async () => {
      mockFetchSequence(
        { body: 'error', status: 500, isJson: true },
        { body: 'error', status: 500, isJson: true },
        { body: '', status: 500 },
      );

      const result = await service.scrape('https://x.com/user/status/9999999999');
      expect(result.title).toBeNull();
      expect(result.description).toBeNull();
      expect(result.imageUrl).toBeNull();
      expect(result.type).toBe('tweet');
    });
  });
});
