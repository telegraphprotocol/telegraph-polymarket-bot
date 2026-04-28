import axios from 'axios';
import { MARKET_MONITOR_CONFIG } from '../config/market-monitor.config';

export interface RelatedNewsItem {
  title: string;
  source: string;
  url: string | null;
  summary: string;
}

export interface NewsFetchMeta {
  retriesAttempted: number;
  rateLimitEncountered: boolean;
}

export interface NewsFetchResult {
  items: RelatedNewsItem[];
  meta: NewsFetchMeta;
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const extractUrl = (text: string): string | null => {
  const match = text.match(/https?:\/\/\S+/i);
  return match ? match[0].replace(/[),.;]+$/, '') : null;
};

const extractSourceFromUrl = (url: string | null) => {
  if (!url) return 'telegraph-groqqle';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'telegraph-groqqle';
  }
};

const parseRetryAfterMs = (retryAfterHeader: string | number | undefined): number | null => {
  if (!retryAfterHeader) return null;
  if (typeof retryAfterHeader === 'number') return retryAfterHeader * 1000;
  const asNumber = Number(retryAfterHeader);
  if (Number.isFinite(asNumber)) return asNumber * 1000;
  const asDate = Date.parse(retryAfterHeader);
  if (Number.isNaN(asDate)) return null;
  return Math.max(asDate - Date.now(), 0);
};

const toRelatedNewsItemsFromStructuredResults = (results: any[]): RelatedNewsItem[] => {
  return results
    .filter((item) => item && typeof item === 'object')
    .slice(0, 3)
    .map((item, idx) => {
      const url = typeof item.url === 'string' ? item.url : null;
      const summary =
        typeof item.content === 'string' ? item.content.replace(/\s+/g, ' ').trim().slice(0, 320) : '';
      return {
        title: typeof item.title === 'string' && item.title.trim() ? item.title.trim() : `Related News ${idx + 1}`,
        source: extractSourceFromUrl(url),
        url,
        summary: summary || 'No summary available',
      };
    });
};

const toRelatedNewsItemsFromContent = (content: string): RelatedNewsItem[] => {
  const lines = content
    .split('\n')
    .map((line: string) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith('|') && !line.startsWith('---'))
    .slice(0, 3);

  return lines.map((line: string, idx: number) => {
    const url = extractUrl(line);
    return {
      title: `Related News ${idx + 1}`,
      source: extractSourceFromUrl(url),
      url,
      summary: line,
    };
  });
};

const isRetryableError = (error: any): boolean => {
  const status = error?.response?.status;
  if (status === 429) return true;
  if (typeof status === 'number' && status >= 500) return true;
  const code = error?.code;
  return ['ECONNABORTED', 'ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN'].includes(code);
};

export class TelegraphNewsService {
  static async searchRelatedNews(query: string): Promise<RelatedNewsItem[]> {
    const result = await this.searchRelatedNewsWithMeta(query);
    return result.items;
  }

  static async searchRelatedNewsWithMeta(query: string): Promise<NewsFetchResult> {
    const url = `${MARKET_MONITOR_CONFIG.telegraphBaseUrl}${MARKET_MONITOR_CONFIG.newsPath}`;

    // Keep request shape aligned with example-telegraph integration/test-groqqle.ts.
    const body = {
      model: 'groq/compound-mini',
      messages: [
        {
          role: 'user',
          content: `Find recent news related to this prediction market: ${query}. Return concise findings.`,
        },
      ],
      max_tokens: 300,
    };

    let retriesAttempted = 0;
    let rateLimitEncountered = false;
    const maxAttempts = Math.max(1, MARKET_MONITOR_CONFIG.newsRetryMaxAttempts + 1);

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const response = await axios.post(url, body, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 20000,
        });

        const structuredResults =
          response.data?.choices?.[0]?.message?.executed_tools?.[0]?.search_results?.results;
        const byStructured = Array.isArray(structuredResults)
          ? toRelatedNewsItemsFromStructuredResults(structuredResults)
          : [];
        if (byStructured.length > 0) {
          return {
            items: byStructured,
            meta: { retriesAttempted, rateLimitEncountered },
          };
        }

        const content = response.data?.choices?.[0]?.message?.content;
        if (!content || typeof content !== 'string') {
          return { items: [], meta: { retriesAttempted, rateLimitEncountered } };
        }

        return {
          items: toRelatedNewsItemsFromContent(content),
          meta: { retriesAttempted, rateLimitEncountered },
        };
      } catch (error: any) {
        const retryable = isRetryableError(error);
        const status = error?.response?.status;
        if (status === 429) rateLimitEncountered = true;

        if (!retryable || attempt === maxAttempts) {
          console.error(`Telegraph news lookup failed for "${query}":`, error.message);
          return { items: [], meta: { retriesAttempted, rateLimitEncountered } };
        }

        retriesAttempted += 1;
        const retryAfterMs = parseRetryAfterMs(error?.response?.headers?.['retry-after']);
        const fallbackBackoffMs = MARKET_MONITOR_CONFIG.newsRetryBaseDelayMs * retriesAttempted;
        await sleep(retryAfterMs ?? fallbackBackoffMs);
      }
    }

    return { items: [], meta: { retriesAttempted, rateLimitEncountered } };
  }
}

