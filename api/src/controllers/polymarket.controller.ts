import { Request, Response } from 'express';
import { PolymarketService } from '../services/polymarket.service';

export const searchMarkets = async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Keyword "q" is required' });
    }

    const markets = await PolymarketService.searchTopMarkets(q);
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
