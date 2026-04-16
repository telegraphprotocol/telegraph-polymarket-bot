import cron from 'node-cron';
import { PolymarketService } from '../services/polymarket.service';

const KEYWORDS = ['Fuel Prices', 'Global Conflict', 'Strait of Hormuz'];

/**
 * Initialize the Polymarket discovery cron job
 * Runs every 2 hours
 */
export const initScraperCron = () => {
  // 0 */2 * * * - every 2 hours at minute 0
  // For testing, user might want to see it run soon, but 2h is the requirement.
  cron.schedule('0 */2 * * *', async () => {
    console.log(`[${new Date().toISOString()}] 🤖 Running Polymarket Discovery Scraper...`);
    
    for (const keyword of KEYWORDS) {
      console.log(`🔍 Searching for: "${keyword}"...`);
      const markets = await PolymarketService.searchTopMarkets(keyword);
      
      if (markets.length > 0) {
        console.log(`✅ Found ${markets.length} top markets for "${keyword}":`);
        markets.forEach((m, i) => {
          const summary = PolymarketService.formatMarketSummary(m as any);
          console.log(`   ${i + 1}. ${summary.title} (${summary.liquidity} liq, ${summary.volume} vol)`);
        });
      } else {
        console.log(`⚠️ No active markets found for "${keyword}".`);
      }
    }
    
    console.log(`[${new Date().toISOString()}] ✨ Discovery cycle complete.`);
  });

  console.log('📅 Polymarket Scraper Cron initialized (every 2 hours).');
};

/**
 * Trigger a manual run for immediate verification
 */
export const runManualScrape = async () => {
  console.log('🚀 Triggering manual Polymarket scrape...');
  for (const keyword of KEYWORDS) {
    const markets = await PolymarketService.searchTopMarkets(keyword);
    console.log(`Keyword: ${keyword} | Found: ${markets.length} markets`);
  }
};
