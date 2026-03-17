import { Injectable } from '@nestjs/common';

@Injectable()
export class ScraperUtilsService {
  /** Trims a string and returns null if the result is empty or whitespace-only. */
  sanitize(value: string | null | undefined): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  extractMeta(html: string, name: string): string | null {
    // Handles both property="og:*" and name="*" forms, and both attribute orderings
    const patterns = [
      new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"'<>]+)["']`, 'i'),
      new RegExp(`<meta[^>]+content=["']([^"'<>]+)["'][^>]+(?:property|name)=["']${name}["']`, 'i'),
    ];
    for (const re of patterns) {
      const m = html.match(re);
      if (m?.[1]) return this.decodeEntities(m[1].trim());
    }
    return null;
  }

  extractTitle(html: string): string | null {
    const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return m?.[1] ? this.decodeEntities(m[1].trim()) : null;
  }

  decodeEntities(str: string): string {
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)));
  }

  /** Fetches up to 500 KB of HTML from a URL, returning null on failure. */
  async fetchHtml(url: string): Promise<string | null> {
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

    if (!response.ok) return null;

    const reader = response.body?.getReader();
    if (!reader) return null;

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

    return new TextDecoder().decode(
      chunks.reduce((acc, chunk) => {
        const merged = new Uint8Array(acc.byteLength + chunk.byteLength);
        merged.set(acc, 0);
        merged.set(chunk, acc.byteLength);
        return merged;
      }, new Uint8Array(0)),
    );
  }
}
