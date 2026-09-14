const express = require('express');
const { protect, requireRole } = require('../middleware/authMiddleware');
const MarketSettings = require('../models/MarketSettings');
const MarketOrder = require('../models/MarketOrder');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const router = express.Router();

const fallbackQuotes = [
  { symbol: 'AAPL', name: 'Apple', price: 228.87, changePercent: 1.24, points: [224.2, 225.1, 224.8, 226.4, 227.1, 226.8, 228.87] },
  { symbol: 'MSFT', name: 'Microsoft', price: 507.23, changePercent: 0.86, points: [502.4, 503.2, 504.1, 503.7, 505.8, 506.4, 507.23] },
  { symbol: 'NVDA', name: 'NVIDIA', price: 177.81, changePercent: -0.42, points: [179.8, 179.1, 178.7, 179.2, 178.4, 178.1, 177.81] },
  { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', price: 571.46, changePercent: 0.31, points: [568.8, 569.4, 570.1, 569.8, 570.7, 571.1, 571.46] },
  { symbol: 'AMZN', name: 'Amazon.com', price: 228.68, changePercent: 0.74, points: [226.1, 226.8, 227.4, 227.1, 228.2, 228.4, 228.68] },
  { symbol: 'TSLA', name: 'Tesla', price: 330.56, changePercent: -1.12, points: [335.7, 334.4, 333.9, 332.8, 332.1, 331.2, 330.56] },
  { symbol: 'META', name: 'Meta Platforms', price: 736.67, changePercent: 0.55, points: [731.2, 732.6, 733.4, 734.8, 735.1, 736.2, 736.67] },
  { symbol: 'GOOGL', name: 'Alphabet Class A', price: 251.61, changePercent: 0.38, points: [249.4, 250.2, 249.9, 250.7, 250.8, 251.2, 251.61] },
  { symbol: 'JPM', name: 'JPMorgan Chase', price: 311.04, changePercent: 0.21, points: [309.8, 310.1, 310.4, 310.2, 310.8, 310.9, 311.04] },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', price: 646.57, changePercent: 0.27, points: [643.8, 644.2, 645.1, 644.8, 645.7, 646.2, 646.57] },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', price: 570.12, changePercent: 0.44, points: [566.9, 567.8, 568.4, 568.1, 569.2, 569.8, 570.12] },
];

const formatQuote = (quote, chartPoints) => ({
  symbol: quote.symbol,
  name: quote.name,
  price: Number(quote.price.toFixed(2)),
  changePercent: Number(quote.changePercent.toFixed(2)),
  previousClose: Number((quote.previousClose ?? (quote.price / (1 + quote.changePercent / 100))).toFixed(2)),
  changeAmount: Number((quote.price - (quote.previousClose ?? (quote.price / (1 + quote.changePercent / 100)))).toFixed(2)),
  points: chartPoints.map((point) => Number(point.toFixed(2))),
});

const fetchYahooQuote = async (fallback) => {
  try {
    const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${fallback.symbol}?range=1d&interval=5m`);
    if (!response.ok) return fallback;
    const payload = await response.json();
    const result = payload.chart?.result?.[0];
    const close = result?.indicators?.quote?.[0]?.close?.filter(Number.isFinite) || [];
    const meta = result?.meta;
    const price = Number(meta?.regularMarketPrice || close.at(-1));
    if (!Number.isFinite(price) || close.length < 2) return fallback;
    const previousClose = Number(meta?.previousClose || close[0]);
    const changePercent = previousClose ? ((price - previousClose) / previousClose) * 100 : fallback.changePercent;
    return formatQuote({ ...fallback, price, previousClose, changePercent }, close.slice(-24));
  } catch (error) {
    console.warn(`Market quote unavailable for ${fallback.symbol}:`, error.message);
    return fallback;
  }
};

const normalizeSymbol = (value) => String(value || '').trim().toUpperCase().replace(/[^A-Z0-9.-]/g, '');

const fetchQuoteBySymbol = async (symbol, name = symbol) => {
  const safeSymbol = normalizeSymbol(symbol);
  if (!safeSymbol || safeSymbol.length > 10) return null;
  const knownQuote = fallbackQuotes.find((quote) => quote.symbol === safeSymbol);
  if (knownQuote) return fetchYahooQuote(knownQuote);
  return fetchYahooQuote({
    symbol: safeSymbol,
    name,
    price: 0,
    changePercent: 0,
    points: [0, 0],
  });
};

router.get('/search', protect, async (req, res) => {
  const query = String(req.query.q || '').trim();
  if (query.length < 1 || query.length > 40) {
    return res.json({ results: [] });
  }

  try {
    const response = await fetch(`https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=12&newsCount=0`);
    if (!response.ok) return res.json({ results: [] });
    const payload = await response.json();
    const results = (payload.quotes || [])
      .filter((quote) => ['EQUITY', 'ETF'].includes(quote.quoteType) && ['NMS', 'NYQ', 'ASE', 'BTS', 'NGM', 'NCM', 'PCX', 'NASDAQ', 'NYSE'].includes(quote.exchange))
      .slice(0, 10)
      .map((quote) => ({
        symbol: normalizeSymbol(quote.symbol),
        name: quote.longname || quote.shortname || quote.symbol,
        exchange: quote.exchDisp || 'US market',
      }));
    return res.json({ results });
  } catch (error) {
    console.warn('Market symbol search unavailable:', error.message);
    return res.json({ results: [] });
  }
});

router.get('/quote/:symbol', protect, async (req, res) => {
  try {
    const quote = await fetchQuoteBySymbol(req.params.symbol);
    if (!quote || !Number.isFinite(quote.price) || quote.price <= 0) {
      return res.status(404).json({ message: 'Quote not found for that US symbol.' });
    }
    res.json({ quote });
  } catch (error) {
    console.error('Market quote error:', error);
    res.status(500).json({ message: 'Unable to load that market quote.' });
  }
});

const getSettings = async () => {
  let settings = await MarketSettings.findOne({ key: 'primary' });
  if (!settings) settings = await MarketSettings.create({ key: 'primary' });
  return settings;
};

router.get('/overview', protect, async (_req, res) => {
  try {
    const [settings, quotes, tradeTotals] = await Promise.all([
      getSettings(),
      Promise.all(fallbackQuotes.map(fetchYahooQuote)),
      MarketOrder.aggregate([
        { $match: { status: 'submitted' } },
        { $group: { _id: null, estimatedTotal: { $sum: { $multiply: ['$quantity', '$referencePrice'] } }, tradeCount: { $sum: 1 } } },
      ]),
    ]);
    const estimatedTradeTotal = Number((tradeTotals[0]?.estimatedTotal || 0).toFixed(2));
    const todaysReturnPercent = Number(settings.todaysReturnPercent ?? 10.5);
    const calculatedTodaysReturn = Number((estimatedTradeTotal * todaysReturnPercent / 100).toFixed(2));
    const watchlistChanges = new Map((settings.watchlistChanges || []).map((item) => [item.symbol, item.changePercent]));
    const displayQuotes = quotes.map((quote) => {
      if (!watchlistChanges.has(quote.symbol)) return quote;
      const changePercent = Number(watchlistChanges.get(quote.symbol));
      const previousClose = changePercent <= -100 ? 0 : quote.price / (1 + changePercent / 100);
      return {
        ...quote,
        changePercent,
        previousClose: Number(previousClose.toFixed(2)),
        changeAmount: Number((quote.price - previousClose).toFixed(2)),
        points: quote.points?.length > 1 ? [Number(previousClose.toFixed(2)), ...quote.points.slice(1)] : [Number(previousClose.toFixed(2)), quote.price],
      };
    });

    res.json({
      settings: {
        todaysReturn: calculatedTodaysReturn,
        todaysReturnPercent,
        estimatedTradeTotal,
        tradeCount: tradeTotals[0]?.tradeCount || 0,
        marketStatus: settings.marketStatus,
        marketMessage: settings.marketMessage,
        watchlistChanges: settings.watchlistChanges || [],
        updatedAt: settings.updatedAt,
      },
      balance: {
        checking: _req.user.accounts?.find((account) => account.accountType === 'checking')?.balance || 0,
        total: _req.user.balance || 0,
      },
      quotes: displayQuotes,
      dataSource: 'US market reference quotes with fallback demo data',
    });
  } catch (error) {
    console.error('Market overview error:', error);
    res.status(500).json({ message: 'Unable to load market data' });
  }
});

router.post('/orders', protect, async (req, res) => {
  try {
    const symbol = normalizeSymbol(req.body.symbol);
    const quantity = Number(req.body.quantity);
    if (!symbol || !Number.isFinite(quantity) || quantity <= 0 || quantity > 100000) {
      return res.status(400).json({ message: 'Choose a valid US symbol and quantity.' });
    }
    const quote = await fetchQuoteBySymbol(symbol);
    if (!quote || !Number.isFinite(quote.price) || quote.price <= 0) {
      return res.status(400).json({ message: 'That symbol is not currently available for paper trading.' });
    }

    const total = Number((quote.price * quantity).toFixed(2));
    const user = await User.findById(req.userId);
    if (!user) return res.status(401).json({ message: 'User account not found.' });
    user.accounts = Array.isArray(user.accounts) ? user.accounts : [];
    let checking = user.accounts.find((account) => account.accountType === 'checking');
    if (!checking) {
      checking = { accountType: 'checking', accountNumber: `CHK-${Date.now()}`, balance: Number(user.balance || 0) };
      user.accounts.push(checking);
    }
    if (Number(checking.balance || 0) < total) {
      return res.status(402).json({ message: `Insufficient checking balance. Available: $${Number(checking.balance || 0).toFixed(2)}.` });
    }
    checking.balance = Number((Number(checking.balance || 0) - total).toFixed(2));
    user.balance = Number(user.accounts.reduce((sum, account) => sum + Number(account.balance || 0), 0).toFixed(2));
    user.markModified('accounts');
    await user.save();
    const debitedUser = user;
    if (!debitedUser) {
      return res.status(402).json({ message: 'Insufficient checking balance for this order.' });
    }

    let order;
    try {
      order = await MarketOrder.create({
        userId: req.userId,
        symbol,
        quantity,
        referencePrice: quote.price,
      });
      await Transaction.create({
        userId: req.userId,
        amount: -total,
        description: `Buy ${quantity} ${symbol} share${quantity === 1 ? '' : 's'}`,
        category: 'Investment',
        accountType: 'checking',
        status: 'completed',
        transferType: 'investment',
        note: `Paper order at ${quote.price.toFixed(2)} per share`,
        reference: `market-${order._id}`,
      });
    } catch (writeError) {
      if (order?._id) await MarketOrder.deleteOne({ _id: order._id });
      const rollbackUser = await User.findById(req.userId);
      const rollbackChecking = rollbackUser?.accounts?.find((account) => account.accountType === 'checking');
      if (rollbackUser && rollbackChecking) {
        rollbackChecking.balance = Number((Number(rollbackChecking.balance || 0) + total).toFixed(2));
        rollbackUser.balance = Number(rollbackUser.accounts.reduce((sum, account) => sum + Number(account.balance || 0), 0).toFixed(2));
        rollbackUser.markModified('accounts');
        await rollbackUser.save();
      }
      throw writeError;
    }

    res.status(201).json({
      message: 'Paper order confirmed and balance debited.',
      order: { id: order._id, symbol: order.symbol, quantity: order.quantity, referencePrice: order.referencePrice, total, remainingBalance: debitedUser.balance, status: order.status },
    });
  } catch (error) {
    console.error('Market order error:', error);
    res.status(500).json({ message: error.message || 'Unable to submit order' });
  }
});

router.patch('/settings', protect, requireRole('admin'), async (req, res) => {
  try {
    const todaysReturn = Number(req.body.todaysReturn);
    const todaysReturnPercent = Number(req.body.todaysReturnPercent);
    const marketStatus = req.body.marketStatus;
    const marketMessage = String(req.body.marketMessage || '').trim();
    const hasWatchlistChanges = Object.prototype.hasOwnProperty.call(req.body, 'watchlistChanges');
    const watchlistChanges = Array.isArray(req.body.watchlistChanges)
      ? req.body.watchlistChanges.map((item) => ({
        symbol: normalizeSymbol(item.symbol),
        changePercent: Number(item.changePercent),
      })).filter((item) => item.symbol && Number.isFinite(item.changePercent) && item.changePercent >= -100 && item.changePercent <= 100)
      : [];

    if (!Number.isFinite(todaysReturn) || !Number.isFinite(todaysReturnPercent) || !['open', 'closed'].includes(marketStatus)) {
      return res.status(400).json({ message: 'Enter valid return values and market status.' });
    }

    const settings = await MarketSettings.findOneAndUpdate(
      { key: 'primary' },
      { key: 'primary', todaysReturn, todaysReturnPercent, marketStatus, marketMessage: marketMessage || 'Prices update during US market hours.', ...(hasWatchlistChanges ? { watchlistChanges } : {}), updatedBy: req.userId },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    res.json({ message: 'Market settings updated.', settings });
  } catch (error) {
    console.error('Market settings update error:', error);
    res.status(500).json({ message: 'Unable to update market settings' });
  }
});

module.exports = router;
