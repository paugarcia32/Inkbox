import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScraperUtilsService } from '../scraper-utils.service';
import { InstagramScraperService } from './instagram.scraper';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFetchHtml(html: string) {
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
      ok: true,
      status: 200,
      body: { getReader: () => reader },
    }),
  );
}

function mockFetchError(error = new Error('Network error')) {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error));
}

const POST_HTML = `
  <html><head>
    <meta property="og:title" content="cooluser on Instagram: &quot;Check out this post!&quot;" />
    <meta property="og:description" content="123 likes, 5 comments" />
    <meta property="og:image" content="https://scontent.cdninstagram.com/post.jpg" />
  </head></html>
`;

const REEL_HTML = `
  <html><head>
    <meta property="og:title" content="cooluser on Instagram: &quot;My awesome reel&quot;" />
    <meta property="og:description" content="456 likes" />
    <meta property="og:image" content="https://scontent.cdninstagram.com/reel.jpg" />
  </head></html>
`;

const PROFILE_HTML = `
  <html><head>
    <meta property="og:title" content="Cool User (@cooluser) • Instagram" />
    <meta property="og:description" content="500 Followers, 200 Following, 50 Posts" />
    <meta property="og:image" content="https://scontent.cdninstagram.com/avatar.jpg" />
  </head></html>
`;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('InstagramScraperService', () => {
  let service: InstagramScraperService;

  beforeEach(() => {
    service = new InstagramScraperService(new ScraperUtilsService());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ── canHandle ─────────────────────────────────────────────────────────────

  describe('canHandle', () => {
    it('handles instagram.com post URLs', () => {
      expect(service.canHandle('https://www.instagram.com/p/abc123/')).toBe(true);
    });

    it('handles instagram.com reel URLs', () => {
      expect(service.canHandle('https://www.instagram.com/reel/abc123/')).toBe(true);
    });

    it('handles instagram.com TV URLs', () => {
      expect(service.canHandle('https://www.instagram.com/tv/abc123/')).toBe(true);
    });

    it('handles instagram.com profile URLs', () => {
      expect(service.canHandle('https://www.instagram.com/cooluser/')).toBe(true);
    });

    it('returns false for non-Instagram URLs', () => {
      expect(service.canHandle('https://tiktok.com/@user/video/123')).toBe(false);
      expect(service.canHandle('https://twitter.com/user/status/1')).toBe(false);
      expect(service.canHandle('https://example.com')).toBe(false);
    });
  });

  // ── detectType ────────────────────────────────────────────────────────────

  describe('detectType', () => {
    it('returns video for /reel/ URLs', () => {
      expect(service.detectType('https://www.instagram.com/reel/abc123/')).toBe('video');
    });

    it('returns video for /tv/ URLs', () => {
      expect(service.detectType('https://www.instagram.com/tv/abc123/')).toBe('video');
    });

    it('returns image for /p/ URLs', () => {
      expect(service.detectType('https://www.instagram.com/p/abc123/')).toBe('image');
    });

    it('returns link for profile URLs', () => {
      expect(service.detectType('https://www.instagram.com/cooluser/')).toBe('link');
    });
  });

  // ── Post scraping ─────────────────────────────────────────────────────────

  describe('post scraping (/p/)', () => {
    it('extracts title from og:title', async () => {
      mockFetchHtml(POST_HTML);
      const { title } = await service.scrape('https://www.instagram.com/p/abc123/');
      expect(title).toBe('cooluser on Instagram: "Check out this post!"');
    });

    it('extracts author from og:title pattern', async () => {
      mockFetchHtml(POST_HTML);
      const { author } = await service.scrape('https://www.instagram.com/p/abc123/');
      expect(author).toBe('cooluser');
    });

    it('extracts description from og:description', async () => {
      mockFetchHtml(POST_HTML);
      const { description } = await service.scrape('https://www.instagram.com/p/abc123/');
      expect(description).toBe('123 likes, 5 comments');
    });

    it('extracts imageUrl from og:image', async () => {
      mockFetchHtml(POST_HTML);
      const { imageUrl } = await service.scrape('https://www.instagram.com/p/abc123/');
      expect(imageUrl).toBe('https://scontent.cdninstagram.com/post.jpg');
    });

    it('sets type to image for /p/ URLs', async () => {
      mockFetchHtml(POST_HTML);
      const { type } = await service.scrape('https://www.instagram.com/p/abc123/');
      expect(type).toBe('image');
    });

    it('sets siteName to Instagram', async () => {
      mockFetchHtml(POST_HTML);
      const { siteName } = await service.scrape('https://www.instagram.com/p/abc123/');
      expect(siteName).toBe('Instagram');
    });
  });

  // ── Reel scraping ─────────────────────────────────────────────────────────

  describe('reel scraping (/reel/)', () => {
    it('sets type to video for reel URLs', async () => {
      mockFetchHtml(REEL_HTML);
      const { type } = await service.scrape('https://www.instagram.com/reel/abc123/');
      expect(type).toBe('video');
    });

    it('extracts author from reel og:title', async () => {
      mockFetchHtml(REEL_HTML);
      const { author } = await service.scrape('https://www.instagram.com/reel/abc123/');
      expect(author).toBe('cooluser');
    });

    it('extracts imageUrl from reel og:image', async () => {
      mockFetchHtml(REEL_HTML);
      const { imageUrl } = await service.scrape('https://www.instagram.com/reel/abc123/');
      expect(imageUrl).toBe('https://scontent.cdninstagram.com/reel.jpg');
    });
  });

  // ── Profile scraping ──────────────────────────────────────────────────────

  describe('profile scraping', () => {
    it('sets type to link for profile URLs', async () => {
      mockFetchHtml(PROFILE_HTML);
      const { type } = await service.scrape('https://www.instagram.com/cooluser/');
      expect(type).toBe('link');
    });

    it('extracts title from profile og:title', async () => {
      mockFetchHtml(PROFILE_HTML);
      const { title } = await service.scrape('https://www.instagram.com/cooluser/');
      expect(title).toBe('Cool User (@cooluser) • Instagram');
    });

    it('returns null author when og:title does not match Instagram post pattern', async () => {
      mockFetchHtml(PROFILE_HTML);
      const { author } = await service.scrape('https://www.instagram.com/cooluser/');
      expect(author).toBeNull();
    });
  });

  // ── twitter: fallbacks ────────────────────────────────────────────────────

  describe('twitter: meta tag fallbacks', () => {
    it('falls back to twitter:title when og:title is absent', async () => {
      mockFetchHtml(`
        <html><head>
          <meta name="twitter:title" content="Twitter Title" />
        </head></html>
      `);
      const { title } = await service.scrape('https://www.instagram.com/p/abc123/');
      expect(title).toBe('Twitter Title');
    });

    it('falls back to twitter:image when og:image is absent', async () => {
      mockFetchHtml(`
        <html><head>
          <meta property="og:title" content="user on Instagram: &quot;post&quot;" />
          <meta name="twitter:image" content="https://cdn.instagram.com/twitter.jpg" />
        </head></html>
      `);
      const { imageUrl } = await service.scrape('https://www.instagram.com/p/abc123/');
      expect(imageUrl).toBe('https://cdn.instagram.com/twitter.jpg');
    });
  });

  // ── Error handling ────────────────────────────────────────────────────────

  describe('error handling', () => {
    it('returns emptyResult when fetch fails', async () => {
      mockFetchError();
      const result = await service.scrape('https://www.instagram.com/p/abc123/');
      expect(result.title).toBeNull();
      expect(result.description).toBeNull();
      expect(result.imageUrl).toBeNull();
      expect(result.author).toBeNull();
    });

    it('preserves detected type even when fetch fails', async () => {
      mockFetchError();
      const { type: postType } = await service.scrape('https://www.instagram.com/p/abc123/');
      expect(postType).toBe('image');

      vi.unstubAllGlobals();
      mockFetchError();
      const { type: reelType } = await service.scrape('https://www.instagram.com/reel/abc123/');
      expect(reelType).toBe('video');
    });

    it('returns nulls when HTML body is null', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, body: null }));
      const result = await service.scrape('https://www.instagram.com/p/abc123/');
      expect(result.title).toBeNull();
    });

    it('always returns the full result shape', async () => {
      mockFetchError();
      const result = await service.scrape('https://www.instagram.com/p/abc123/');
      expect(result).toMatchObject({
        title: null,
        description: null,
        imageUrl: null,
        content: null,
        author: null,
        siteName: null,
        type: 'image',
      });
    });
  });

  // ── Full integration ──────────────────────────────────────────────────────

  describe('full integration', () => {
    it('returns all fields populated for a post', async () => {
      mockFetchHtml(POST_HTML);
      const result = await service.scrape('https://www.instagram.com/p/abc123/');
      expect(result).toMatchObject({
        title: 'cooluser on Instagram: "Check out this post!"',
        description: '123 likes, 5 comments',
        imageUrl: 'https://scontent.cdninstagram.com/post.jpg',
        content: null,
        author: 'cooluser',
        siteName: 'Instagram',
        type: 'image',
      });
    });

    it('returns all fields populated for a reel', async () => {
      mockFetchHtml(REEL_HTML);
      const result = await service.scrape('https://www.instagram.com/reel/abc123/');
      expect(result).toMatchObject({
        title: 'cooluser on Instagram: "My awesome reel"',
        description: '456 likes',
        imageUrl: 'https://scontent.cdninstagram.com/reel.jpg',
        content: null,
        author: 'cooluser',
        siteName: 'Instagram',
        type: 'video',
      });
    });
  });
});
