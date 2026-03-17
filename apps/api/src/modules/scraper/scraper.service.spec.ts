import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScraperService } from './scraper.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Creates a mock fetch that streams the given HTML string as a single chunk. */
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

  return reader;
}

/** Makes fetch reject with a network error. */
function mockFetchError(error = new Error('Network error')) {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error));
}

/**
 * Creates a mock fetch that returns sequential responses.
 * Each response can be either JSON (for oEmbed) or HTML (for page fetch).
 * The last entry is reused if there are more calls than entries.
 */
function mockFetchSequence(
  ...responses: Array<{ body: string; status?: number; isJson?: boolean }>
) {
  let callIndex = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(() => {
      const config = responses[callIndex] ?? responses[responses.length - 1] ?? { body: '', status: 200 };
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

describe('ScraperService', () => {
  let service: ScraperService;

  beforeEach(() => {
    service = new ScraperService();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ── Type detection ────────────────────────────────────────────────────────

  describe('type detection', () => {
    beforeEach(() => mockFetch(''));

    it('detects youtube.com', async () => {
      const { type } = await service.scrape('https://www.youtube.com/watch?v=abc');
      expect(type).toBe('youtube');
    });

    it('detects youtu.be short URLs', async () => {
      const { type } = await service.scrape('https://youtu.be/abc');
      expect(type).toBe('youtube');
    });

    it('detects twitter.com', async () => {
      const { type } = await service.scrape('https://twitter.com/user/status/1');
      expect(type).toBe('tweet');
    });

    it('detects x.com', async () => {
      const { type } = await service.scrape('https://x.com/user/status/1');
      expect(type).toBe('tweet');
    });

    it('falls back to article for generic URLs', async () => {
      const { type } = await service.scrape('https://example.com/post');
      expect(type).toBe('article');
    });
  });

  // ── Title extraction ──────────────────────────────────────────────────────

  describe('title extraction', () => {
    it('prefers og:title over <title>', async () => {
      mockFetch(`
        <html>
          <head>
            <meta property="og:title" content="OG Title" />
            <title>HTML Title</title>
          </head>
        </html>
      `);
      const { title } = await service.scrape('https://example.com');
      expect(title).toBe('OG Title');
    });

    it('prefers twitter:title when og:title is absent', async () => {
      mockFetch(`
        <html><head>
          <meta name="twitter:title" content="Twitter Title" />
          <title>HTML Title</title>
        </head></html>
      `);
      const { title } = await service.scrape('https://example.com');
      expect(title).toBe('Twitter Title');
    });

    it('falls back to <title> when no og/twitter meta', async () => {
      mockFetch('<html><head><title>Page Title</title></head></html>');
      const { title } = await service.scrape('https://example.com');
      expect(title).toBe('Page Title');
    });

    it('returns null when no title meta or tag is found', async () => {
      mockFetch('<html><head></head></html>');
      const { title } = await service.scrape('https://example.com');
      expect(title).toBeNull();
    });

    it('handles content attribute before property attribute', async () => {
      mockFetch(`<meta content="Reversed Title" property="og:title" />`);
      const { title } = await service.scrape('https://example.com');
      expect(title).toBe('Reversed Title');
    });
  });

  // ── Description extraction ────────────────────────────────────────────────

  describe('description extraction', () => {
    it('prefers og:description over name="description"', async () => {
      mockFetch(`
        <meta property="og:description" content="OG desc" />
        <meta name="description" content="Plain desc" />
      `);
      const { description } = await service.scrape('https://example.com');
      expect(description).toBe('OG desc');
    });

    it('falls back to twitter:description', async () => {
      mockFetch(`<meta name="twitter:description" content="Twitter desc" />`);
      const { description } = await service.scrape('https://example.com');
      expect(description).toBe('Twitter desc');
    });

    it('falls back to name="description"', async () => {
      mockFetch(`<meta name="description" content="Plain desc" />`);
      const { description } = await service.scrape('https://example.com');
      expect(description).toBe('Plain desc');
    });

    it('returns null when no description meta found', async () => {
      mockFetch('<html><head></head></html>');
      const { description } = await service.scrape('https://example.com');
      expect(description).toBeNull();
    });
  });

  // ── Image extraction ──────────────────────────────────────────────────────

  describe('imageUrl extraction', () => {
    it('extracts og:image', async () => {
      mockFetch(`<meta property="og:image" content="https://example.com/img.jpg" />`);
      const { imageUrl } = await service.scrape('https://example.com');
      expect(imageUrl).toBe('https://example.com/img.jpg');
    });

    it('falls back to twitter:image', async () => {
      mockFetch(`<meta name="twitter:image" content="https://example.com/tw.jpg" />`);
      const { imageUrl } = await service.scrape('https://example.com');
      expect(imageUrl).toBe('https://example.com/tw.jpg');
    });

    it('returns null when no image meta found', async () => {
      mockFetch('<html><head></head></html>');
      const { imageUrl } = await service.scrape('https://example.com');
      expect(imageUrl).toBeNull();
    });
  });

  // ── siteName extraction ───────────────────────────────────────────────────

  describe('siteName extraction', () => {
    it('extracts og:site_name', async () => {
      mockFetch(`<meta property="og:site_name" content="My Site" />`);
      const { siteName } = await service.scrape('https://example.com');
      expect(siteName).toBe('My Site');
    });

    it('returns null when og:site_name is absent', async () => {
      mockFetch('<html><head></head></html>');
      const { siteName } = await service.scrape('https://example.com');
      expect(siteName).toBeNull();
    });
  });

  // ── HTML entity decoding ──────────────────────────────────────────────────

  describe('HTML entity decoding', () => {
    it('decodes &amp; in title', async () => {
      mockFetch(`<meta property="og:title" content="Foo &amp; Bar" />`);
      const { title } = await service.scrape('https://example.com');
      expect(title).toBe('Foo & Bar');
    });

    it('decodes &quot; in description', async () => {
      mockFetch(`<meta name="description" content="Say &quot;hello&quot;" />`);
      const { description } = await service.scrape('https://example.com');
      expect(description).toBe('Say "hello"');
    });

    it('decodes &#039; (numeric entity)', async () => {
      mockFetch(`<title>It&#039;s fine</title>`);
      const { title } = await service.scrape('https://example.com');
      expect(title).toBe("It's fine");
    });

    it('decodes &lt; and &gt;', async () => {
      mockFetch(`<title>&lt;Tag&gt;</title>`);
      const { title } = await service.scrape('https://example.com');
      expect(title).toBe('<Tag>');
    });

    it('decodes decimal numeric entities (&#NNN;)', async () => {
      mockFetch(`<title>caf&#233;</title>`);
      const { title } = await service.scrape('https://example.com');
      expect(title).toBe('café');
    });
  });

  // ── Error handling ────────────────────────────────────────────────────────

  describe('error handling', () => {
    it('returns nulls when fetch throws (network error)', async () => {
      mockFetchError(new Error('ECONNREFUSED'));
      const result = await service.scrape('https://example.com');
      expect(result.title).toBeNull();
      expect(result.description).toBeNull();
      expect(result.imageUrl).toBeNull();
    });

    it('returns nulls on non-OK response (404)', async () => {
      mockFetch('Not Found', 404);
      const result = await service.scrape('https://example.com');
      expect(result.title).toBeNull();
      expect(result.description).toBeNull();
    });

    it('returns nulls on non-OK response (500)', async () => {
      mockFetch('Internal Server Error', 500);
      const result = await service.scrape('https://example.com');
      expect(result.title).toBeNull();
    });

    it('still returns the correct type even on network error', async () => {
      mockFetchError();
      const result = await service.scrape('https://youtube.com/watch?v=1');
      expect(result.type).toBe('youtube');
    });

    it('returns nulls when response body is null', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: true, status: 200, body: null }),
      );
      const result = await service.scrape('https://example.com');
      expect(result.title).toBeNull();
    });

    it('always returns the full result shape', async () => {
      mockFetchError();
      const result = await service.scrape('https://example.com');
      expect(result).toMatchObject({
        title: null,
        description: null,
        imageUrl: null,
        content: null,
        author: null,
        siteName: null,
        type: 'article',
      });
    });
  });

  // ── Full page parse (realistic HTML) ─────────────────────────────────────

  describe('full page parse', () => {
    it('extracts all fields from a realistic HTML page', async () => {
      mockFetch(`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <title>Fallback Title</title>
            <meta property="og:title" content="Vector Databases Explained" />
            <meta property="og:description" content="How vector databases store and search unstructured data." />
            <meta property="og:image" content="https://example.com/og-image.png" />
            <meta property="og:site_name" content="Dev Blog" />
          </head>
          <body><p>Article content here.</p></body>
        </html>
      `);

      const result = await service.scrape('https://example.com/blog/vector-databases');
      expect(result.title).toBe('Vector Databases Explained');
      expect(result.description).toBe('How vector databases store and search unstructured data.');
      expect(result.imageUrl).toBe('https://example.com/og-image.png');
      expect(result.siteName).toBe('Dev Blog');
      expect(result.type).toBe('article');
    });

    it('extracts title from <title> when og tags are missing', async () => {
      mockFetch(`
        <!DOCTYPE html>
        <html><head><title>Simple Page</title></head><body></body></html>
      `);
      const { title } = await service.scrape('https://example.com');
      expect(title).toBe('Simple Page');
    });
  });

  // ── Pinterest scraping ────────────────────────────────────────────────────

  describe('Pinterest scraping', () => {
    it('detects pinterest.com URLs as type pinterest', async () => {
      mockFetchSequence(
        { body: JSON.stringify({ title: 'T', author_name: 'A', thumbnail_url: 'https://i.pinimg.com/img.jpg' }), isJson: true },
        { body: '' },
      );
      const { type } = await service.scrape('https://www.pinterest.com/pin/123/');
      expect(type).toBe('pinterest');
    });

    it('detects pin.it short URLs as type pinterest', async () => {
      mockFetchSequence(
        { body: JSON.stringify({ title: 'T', author_name: 'A', thumbnail_url: 'https://i.pinimg.com/img.jpg' }), isJson: true },
        { body: '' },
      );
      const { type } = await service.scrape('https://pin.it/abc123');
      expect(type).toBe('pinterest');
    });

    it('extracts title, author, imageUrl from oEmbed response', async () => {
      mockFetchSequence(
        {
          body: JSON.stringify({
            title: 'Beautiful Landscape',
            author_name: 'Jane Doe',
            thumbnail_url: 'https://i.pinimg.com/originals/ab.jpg',
          }),
          isJson: true,
        },
        { body: '' },
      );
      const result = await service.scrape('https://www.pinterest.com/pin/123/');
      expect(result.title).toBe('Beautiful Landscape');
      expect(result.author).toBe('Jane Doe');
      expect(result.imageUrl).toBe('https://i.pinimg.com/originals/ab.jpg');
      expect(result.siteName).toBe('Pinterest');
      expect(result.type).toBe('pinterest');
    });

    it('extracts description from HTML og:description', async () => {
      mockFetchSequence(
        { body: JSON.stringify({ title: 'T', author_name: 'A', thumbnail_url: 'https://img.jpg' }), isJson: true },
        { body: '<meta property="og:description" content="Pin description here" />' },
      );
      const { description } = await service.scrape('https://www.pinterest.com/pin/123/');
      expect(description).toBe('Pin description here');
    });

    it('returns nulls gracefully when oEmbed returns 404', async () => {
      mockFetchSequence(
        { body: 'Not Found', status: 404, isJson: true },
        { body: '' },
      );
      const result = await service.scrape('https://www.pinterest.com/pin/123/');
      expect(result.title).toBeNull();
      expect(result.imageUrl).toBeNull();
      expect(result.type).toBe('pinterest');
    });

    it('returns nulls gracefully when oEmbed throws a network error', async () => {
      let callCount = 0;
      vi.stubGlobal('fetch', vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.reject(new Error('ECONNREFUSED'));
        return Promise.resolve({ ok: false, status: 500, body: null, json: vi.fn() });
      }));
      const result = await service.scrape('https://www.pinterest.com/pin/123/');
      expect(result.title).toBeNull();
      expect(result.type).toBe('pinterest');
    });

    it('returns oEmbed title even when HTML phase fails', async () => {
      let callCount = 0;
      vi.stubGlobal('fetch', vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            status: 200,
            body: null,
            json: vi.fn().mockResolvedValue({ title: 'From oEmbed', author_name: 'A', thumbnail_url: 'https://img.jpg' }),
          });
        }
        return Promise.reject(new Error('Network error'));
      }));
      const result = await service.scrape('https://www.pinterest.com/pin/123/');
      expect(result.title).toBe('From oEmbed');
      expect(result.description).toBeNull();
    });
  });
});
