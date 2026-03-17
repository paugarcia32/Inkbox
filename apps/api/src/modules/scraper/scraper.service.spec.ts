import { describe, expect, it, vi } from 'vitest';
import type { IScraper, ScrapeResult } from './interfaces/scraper.interface';
import { ScraperService } from './scraper.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStrategy(canHandle: boolean, result: Partial<ScrapeResult> = {}): IScraper {
  const full: ScrapeResult = {
    title: null,
    description: null,
    imageUrl: null,
    content: null,
    author: null,
    siteName: null,
    type: 'article',
    ...result,
  };
  return {
    canHandle: vi.fn().mockReturnValue(canHandle),
    scrape: vi.fn().mockResolvedValue(full),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ScraperService (orchestrator)', () => {
  describe('strategy routing', () => {
    it('delegates to the first strategy whose canHandle returns true', async () => {
      const twitter = makeStrategy(false);
      const pinterest = makeStrategy(true, { type: 'pinterest', siteName: 'Pinterest' });
      const generic = makeStrategy(true, { type: 'article' });

      const service = new ScraperService([twitter, pinterest, generic]);
      const result = await service.scrape('https://www.pinterest.com/pin/123/');

      expect(twitter.canHandle).toHaveBeenCalledWith('https://www.pinterest.com/pin/123/');
      expect(pinterest.canHandle).toHaveBeenCalledWith('https://www.pinterest.com/pin/123/');
      expect(pinterest.scrape).toHaveBeenCalledWith('https://www.pinterest.com/pin/123/');
      expect(generic.scrape).not.toHaveBeenCalled();
      expect(result.type).toBe('pinterest');
    });

    it('skips non-matching strategies and falls back to generic', async () => {
      const twitter = makeStrategy(false);
      const pinterest = makeStrategy(false);
      const generic = makeStrategy(true, { type: 'article', title: 'Generic Result' });

      const service = new ScraperService([twitter, pinterest, generic]);
      const result = await service.scrape('https://example.com');

      expect(twitter.scrape).not.toHaveBeenCalled();
      expect(pinterest.scrape).not.toHaveBeenCalled();
      expect(generic.scrape).toHaveBeenCalledWith('https://example.com');
      expect(result.title).toBe('Generic Result');
    });

    it('routes twitter.com URLs to the Twitter strategy', async () => {
      const twitter = makeStrategy(true, { type: 'tweet', siteName: 'X' });
      const pinterest = makeStrategy(false);
      const generic = makeStrategy(true);

      const service = new ScraperService([twitter, pinterest, generic]);
      await service.scrape('https://twitter.com/user/status/123');

      expect(twitter.scrape).toHaveBeenCalled();
      expect(generic.scrape).not.toHaveBeenCalled();
    });

    it('returns whatever the matched strategy returns', async () => {
      const expected: ScrapeResult = {
        title: 'My Tweet',
        description: null,
        imageUrl: 'https://img.jpg',
        content: null,
        author: 'Author',
        siteName: 'X',
        type: 'tweet',
      };
      const twitter = makeStrategy(true, expected);
      const service = new ScraperService([twitter]);

      const result = await service.scrape('https://x.com/user/status/42');
      expect(result).toEqual(expected);
    });
  });

  describe('canHandle call order', () => {
    it('calls canHandle on strategies in order and stops at first match', async () => {
      const calls: string[] = [];
      const s1: IScraper = {
        canHandle: vi.fn().mockImplementation(() => {
          calls.push('s1');
          return false;
        }),
        scrape: vi.fn(),
      };
      const s2: IScraper = {
        canHandle: vi.fn().mockImplementation(() => {
          calls.push('s2');
          return true;
        }),
        scrape: vi.fn().mockResolvedValue({
          title: null,
          description: null,
          imageUrl: null,
          content: null,
          author: null,
          siteName: null,
          type: 'article',
        }),
      };
      const s3: IScraper = {
        canHandle: vi.fn().mockImplementation(() => {
          calls.push('s3');
          return true;
        }),
        scrape: vi.fn(),
      };

      const service = new ScraperService([s1, s2, s3]);
      await service.scrape('https://example.com');

      expect(calls).toEqual(['s1', 's2']);
      expect(s3.canHandle).not.toHaveBeenCalled();
    });
  });
});
