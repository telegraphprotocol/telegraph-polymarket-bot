import axios from 'axios';
import { MARKET_MONITOR_CONFIG } from '../config/market-monitor.config';

export interface PolymarketEvent {
  id: string;
  title: string;
  ticker: string;
  slug: string;
  description: string;
  startDate: string;
  endDate: string;
  image: string;
  icon: string;
  active: boolean;
  closed: boolean;
  liquidity: number;
  volume: number;
  markets: any[];
}

export class PolymarketService {
  private static BASE_URL = 'https://gamma-api.polymarket.com';
  private static MIN_RELEVANCE_SCORE = 1;
  private static IRRELEVANT_TERMS = ['overwatch', 'bo3', 'gaming', 'esports', 'stage'];

  /**
   * Search for top markets based on a keyword.
   * This pipeline is intentionally capped at top 3.
   */
  static async searchTopMarkets(keyword: string, limit = MARKET_MONITOR_CONFIG.marketFetchLimit): Promise<PolymarketEvent[]> {
    const safeLimit = Math.max(1, Math.min(limit, 3));
    try {
      const queryVariants = this.buildQueryVariants(keyword);
      const fetchCandidates = async (candidateLimit: number) => {
        const allCandidates: PolymarketEvent[] = [];
        const seenIds = new Set<string>();
        for (const query of queryVariants) {
          const response = await axios.get(`${this.BASE_URL}/public-search`, {
            params: {
              q: query,
              limit: candidateLimit,
            },
            headers: {
              'User-Agent': 'Mozilla/5.0 (verified-sniper-bot)',
            },
          });

          for (const event of response.data.events || []) {
            const key = event?.id || event?.slug || event?.title;
            if (!key || seenIds.has(key)) continue;
            seenIds.add(key);
            allCandidates.push(event);
          }
        }
        return allCandidates;
      };

      const firstLimit = Math.max(MARKET_MONITOR_CONFIG.marketFetchCandidateLimit, 10);
      const secondLimit = Math.max(firstLimit * 3, 30);

      const firstPassCandidates = await fetchCandidates(firstLimit);
      const firstPassActiveRelevant = firstPassCandidates
        .filter((event: PolymarketEvent) => event?.active && !event?.closed)
        .filter((event: PolymarketEvent) => this.relevanceScore(keyword, event) >= this.MIN_RELEVANCE_SCORE);

      const allCandidates =
        firstPassActiveRelevant.length >= safeLimit ? firstPassCandidates : await fetchCandidates(secondLimit);

      const activeCandidates = allCandidates.filter((event: PolymarketEvent) => event?.active && !event?.closed);
      const relevantCandidates = activeCandidates.filter((event: PolymarketEvent) => this.relevanceScore(keyword, event) >= this.MIN_RELEVANCE_SCORE);
      const relaxedCandidates =
        relevantCandidates.length >= safeLimit
          ? relevantCandidates
          : activeCandidates;
      let finalMarkets = relaxedCandidates.sort((a, b) => (b?.liquidity || 0) - (a?.liquidity || 0)).slice(0, safeLimit);
      const selectedKeys = new Set(finalMarkets.map((event) => event?.id || event?.slug || event?.title));

      try {
        const eventsResponse = await axios.get(`${this.BASE_URL}/events`, {
          params: {
            active: true,
            closed: false,
            limit: Math.max(MARKET_MONITOR_CONFIG.marketFetchCandidateLimit * 5, 50),
          },
          headers: {
            'User-Agent': 'Mozilla/5.0 (verified-sniper-bot)',
          },
        });
        const events = (eventsResponse.data || []) as PolymarketEvent[];
        const keywordTerms = keyword.toLowerCase().split(/\s+/).filter(Boolean);
        const matchedActiveEvents = events.filter((event: PolymarketEvent) => {
          const text = `${event?.title || ''} ${event?.description || ''}`.toLowerCase();
          return keywordTerms.some((term) => text.includes(term));
        });
        const fallbackPool =
          matchedActiveEvents.length >= safeLimit
            ? matchedActiveEvents
            : [
                ...matchedActiveEvents,
                ...events.filter((event) => {
                  const key = event?.id || event?.slug || event?.title;
                  return !!key && !matchedActiveEvents.some((matched) => (matched?.id || matched?.slug || matched?.title) === key);
                }),
              ];

        for (const event of fallbackPool.sort((a, b) => (b?.liquidity || 0) - (a?.liquidity || 0))) {
          if (finalMarkets.length >= safeLimit) break;
          const key = event?.id || event?.slug || event?.title;
          if (!key || selectedKeys.has(key)) continue;
          selectedKeys.add(key);
          finalMarkets.push(event);
        }

      } catch (probeError: any) {
        void probeError;
      }

      return finalMarkets;
    } catch (error: any) {
      console.error(`Polymarket search failed for keyword "${keyword}":`, error.message);
      return [];
    }
  }

  /**
   * Clean and format market data for logging/processing
   */
  static formatMarketSummary(event: PolymarketEvent) {
    const markets = Array.isArray(event.markets) ? event.markets : [];
    const parseOutcomePrices = (market: any): [string, string] | null => {
      if (!market?.outcomePrices) return null;
      try {
        const prices = typeof market.outcomePrices === 'string' ? JSON.parse(market.outcomePrices) : market.outcomePrices;
        if (!Array.isArray(prices) || prices.length < 2) return null;
        return [String(prices[0]), String(prices[1])];
      } catch {
        return null;
      }
    };
    const marketLiquidity = (market: any) => {
      const numeric = Number(market?.liquidityNum ?? market?.liquidity ?? 0);
      return Number.isFinite(numeric) ? numeric : 0;
    };
    const rankMarket = (market: any) => {
      const activeOpen = market?.active === true && market?.closed !== true ? 1 : 0;
      const acceptingOrders = market?.acceptingOrders === true ? 1 : 0;
      const hasPrices = parseOutcomePrices(market) ? 1 : 0;
      return [activeOpen, acceptingOrders, hasPrices, marketLiquidity(market)] as const;
    };
    const sortedMarkets = [...markets].sort((a, b) => {
      const left = rankMarket(a);
      const right = rankMarket(b);
      for (let i = 0; i < left.length; i += 1) {
        if (right[i] !== left[i]) return right[i] - left[i];
      }
      return 0;
    });
    const mainMarket = sortedMarkets[0] || null;
    const [yesRaw, noRaw] = mainMarket ? parseOutcomePrices(mainMarket) || ['0', '0'] : ['0', '0'];
    const formatCents = (raw: string) => {
      const value = Number(raw);
      if (!Number.isFinite(value)) return 'N/A';
      const cents = value * 100;
      const formatted = cents.toFixed(cents < 1 ? 2 : 1).replace(/\.0$/, '').replace(/(\.\d*[1-9])0$/, '$1');
      return `${formatted}¢`;
    };

    return {
      title: event.title,
      slug: event.slug,
      liquidity: `$${(event.liquidity || 0).toLocaleString()}`,
      volume: `$${(event.volume || 0).toLocaleString()}`,
      yesPrice: formatCents(yesRaw),
      noPrice: formatCents(noRaw),
      url: `https://polymarket.com/event/${event.slug}`,
      active: event.active && !event.closed,
    };
  }

  private static buildQueryVariants(keyword: string): string[] {
    const base = keyword.trim();
    const variants = [base];
    const lower = base.toLowerCase();

    if (lower.includes('fuel') || lower.includes('oil') || lower.includes('gas')) {
      variants.push(`${base} oil`, `${base} energy`, 'oil price');
    }

    return [...new Set(variants)];
  }

  private static relevanceScore(keyword: string, event: PolymarketEvent): number {
    const text = `${event?.title || ''} ${event?.description || ''}`.toLowerCase();
    const keywordTerms = keyword.toLowerCase().split(/\s+/).filter(Boolean);
    let score = 0;

    for (const term of keywordTerms) {
      if (text.includes(term)) score += 1;
    }

    for (const blocked of this.IRRELEVANT_TERMS) {
      if (text.includes(blocked)) score -= 5;
    }

    return score;
  }
}
