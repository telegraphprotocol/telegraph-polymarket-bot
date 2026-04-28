import { Request, Response } from 'express';
import { PolymarketService } from '../services/polymarket.service';
import { MARKET_MONITOR_CONFIG } from '../config/market-monitor.config';
import { MarketDecisionService } from '../services/market-decision.service';

export const searchMarkets = async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Keyword "q" is required' });
    }

    const markets = await PolymarketService.searchTopMarkets(q, MARKET_MONITOR_CONFIG.marketFetchLimit);
    const summary = markets.map(m => PolymarketService.formatMarketSummary(m as any));

    res.json({
      query: q,
      count: summary.length,
      markets: summary
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const runDecisionPipeline = async (_req: Request, res: Response) => {
  try {
    const result = await MarketDecisionService.runDecisionPipelineOnce();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to run decision pipeline' });
  }
};
