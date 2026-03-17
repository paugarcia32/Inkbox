import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScraperUtilsService } from '../scraper-utils.service';
import { PinterestScraperService } from './pinterest.scraper';

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

describe('PinterestScraperService', () => {
  let service: PinterestScraperService;

  beforeEach(() => {
    service = new PinterestScraperService(new ScraperUtilsService());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ── canHandle ─────────────────────────────────────────────────────────────

  describe('canHandle', () => {
    it('returns true for pinterest.com', () => {
      expect(service.canHandle('https://www.pinterest.com/pin/123/')).toBe(true);
    });

    it('returns true for pin.it short URLs', () => {
      expect(service.canHandle('https://pin.it/abc123')).toBe(true);
    });

    it('returns false for other domains', () => {
      expect(service.canHandle('https://example.com')).toBe(false);
      expect(service.canHandle('https://twitter.com/user/status/123')).toBe(false);
      expect(service.canHandle('https://youtube.com/watch?v=abc')).toBe(false);
    });
  });

  // ── oEmbed (Phase 1) ──────────────────────────────────────────────────────

  describe('oEmbed', () => {
    it('extracts title, author, imageUrl and sets type=pinterest and siteName=Pinterest', async () => {
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

    it('returns oEmbed title even when HTML phase fails', async () => {
      let callCount = 0;
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve({
              ok: true,
              status: 200,
              body: null,
              json: vi.fn().mockResolvedValue({
                title: 'From oEmbed',
                author_name: 'A',
                thumbnail_url: 'https://img.jpg',
              }),
            });
          }
          return Promise.reject(new Error('Network error'));
        }),
      );
      const result = await service.scrape('https://www.pinterest.com/pin/123/');
      expect(result.title).toBe('From oEmbed');
      expect(result.description).toBeNull();
    });
  });

  // ── HTML fallback (Phase 2) ───────────────────────────────────────────────

  describe('HTML fallback', () => {
    it('extracts description from og:description', async () => {
      mockFetchSequence(
        {
          body: JSON.stringify({ title: 'T', author_name: 'A', thumbnail_url: 'https://img.jpg' }),
          isJson: true,
        },
        { body: '<meta property="og:description" content="Pin description here" />' },
      );
      const { description } = await service.scrape('https://www.pinterest.com/pin/123/');
      expect(description).toBe('Pin description here');
    });
  });

  // ── Hostname fallback (Phase 3) ───────────────────────────────────────────

  describe('hostname fallback', () => {
    it('falls back to hostname title when oEmbed returns 404', async () => {
      mockFetchSequence({ body: 'Not Found', status: 404, isJson: true }, { body: '' });
      const result = await service.scrape('https://www.pinterest.com/pin/123/');
      expect(result.title).toBe('pinterest.com');
      expect(result.imageUrl).toBeNull();
      expect(result.type).toBe('pinterest');
    });

    it('falls back to hostname title when oEmbed throws a network error', async () => {
      let callCount = 0;
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) return Promise.reject(new Error('ECONNREFUSED'));
          return Promise.resolve({ ok: false, status: 500, body: null, json: vi.fn() });
        }),
      );
      const result = await service.scrape('https://www.pinterest.com/pin/123/');
      expect(result.title).toBe('pinterest.com');
      expect(result.type).toBe('pinterest');
    });
  });
});
