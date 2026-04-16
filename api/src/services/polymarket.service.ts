import axios from 'axios';

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

  /**
   * Search for top 5 markets based on a keyword
   */
  static async searchTopMarkets(keyword: string): Promise<PolymarketEvent[]> {
    try {
      const response = await axios.get(`${this.BASE_URL}/public-search`, {
        params: {
          q: keyword,
          limit: 5,
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (verified-sniper-bot)',
        },
      });

      return response.data.events || [];
    } catch (error: any) {
      console.error(`Polymarket search failed for keyword "${keyword}":`, error.message);
      return [];
    }
  }

  /**
   * Clean and format market data for logging/processing
   */
  static formatMarketSummary(event: PolymarketEvent) {
    const mainMarket = event.markets && event.markets.length > 0 ? event.markets[0] : null;
    let yesPrice = '0.00';
    let noPrice = '0.00';

    if (mainMarket && mainMarket.outcomePrices) {
      try {
        const prices = typeof mainMarket.outcomePrices === 'string' 
          ? JSON.parse(mainMarket.outcomePrices) 
          : mainMarket.outcomePrices;
          
        if (Array.isArray(prices) && prices.length >= 2) {
          yesPrice = prices[0];
          noPrice = prices[1];
        }
      } catch (e) {
        console.error('Failed to parse outcome prices:', e);
      }
    }

    return {
      title: event.title,
      slug: event.slug,
      liquidity: `$${(event.liquidity || 0).toLocaleString()}`,
      volume: `$${(event.volume || 0).toLocaleString()}`,
      yesPrice: `${Math.round(parseFloat(yesPrice) * 100)}¢`,
      noPrice: `${Math.round(parseFloat(noPrice) * 100)}¢`,
      url: `https://polymarket.com/event/${event.slug}`,
      active: event.active && !event.closed,
    };
  }
}
