const express = require('express');
const { protect, requireRole } = require('../middleware/authMiddleware');
const MarketSettings = require('../models/MarketSettings');
const MarketOrder = require('../models/MarketOrder');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { getUserTradeTotal } = require('../utils/marketTotals');

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
  { symbol: 'AMD', name: 'Advanced Micro Devices', price: 504.20, changePercent: 2.19, points: [493.44, 495.5, 497.8, 499.6, 501.2, 502.8, 504.2] },
  { symbol: 'NFLX', name: 'Netflix', price: 77.90, changePercent: -3.01, points: [80.24, 79.9, 79.3, 78.7, 78.9, 78.3, 77.9] },
  { symbol: 'DIS', name: 'Walt Disney', price: 107.55, changePercent: -0.96, points: [108.59, 108.3, 108.1, 107.9, 107.7, 107.6, 107.55] },
  { symbol: 'WMT', name: 'Walmart', price: 107.15, changePercent: 1.34, points: [105.73, 106.0, 106.3, 106.6, 106.9, 107.0, 107.15] },
  { symbol: 'KO', name: 'Coca-Cola', price: 88.71, changePercent: -0.72, points: [89.35, 89.2, 89.0, 88.9, 88.8, 88.75, 88.71] },
  { symbol: 'BA', name: 'Boeing', price: 205.40, changePercent: -1.20, points: [207.90, 207.5, 207.0, 206.5, 206.1, 205.7, 205.4] },
];

const QUOTE_CACHE_TTL_MS = Math.max(1_000, Number(process.env.MARKET_QUOTE_CACHE_MS) || 30_000);
const QUOTE_FETCH_TIMEOUT_MS = Math.max(500, Number(process.env.MARKET_QUOTE_TIMEOUT_MS) || 4_000);
const MIN_WATCHLIST_CHANGE_PERCENT = -99.99;
const MAX_WATCHLIST_CHANGE_PERCENT = 100;
const watchlistSymbols = new Set(fallbackQuotes.map((quote) => quote.symbol));
const quoteCache = new Map();
const quoteRequests = new Map();

const roundMoney = (value) => Number(Number(value || 0).toFixed(2));

const formatQuote = (quote, chartPoints = []) => {
  const price = Number(quote?.price);
  const safePrice = Number.isFinite(price) && price >= 0 ? price : 0;
  const changePercent = Number(quote?.changePercent);
  const safeChangePercent = Number.isFinite(changePercent) ? changePercent : 0;
  const suppliedPreviousClose = Number(quote?.previousClose);
  const denominator = 1 + (safeChangePercent / 100);
  const calculatedPreviousClose = denominator > 0 ? safePrice / denominator : safePrice;
  const previousClose = Number.isFinite(suppliedPreviousClose) && suppliedPreviousClose >= 0
    ? suppliedPreviousClose
    : calculatedPreviousClose;
  const points = (Array.isArray(chartPoints) ? chartPoints : [])
    .filter(Number.isFinite)
    .slice(-24);

  return {
    symbol: normalizeSymbol(quote?.symbol),
    name: quote?.name || normalizeSymbol(quote?.symbol),
    price: roundMoney(safePrice),
    changePercent: roundMoney(safeChangePercent),
    previousClose: roundMoney(previousClose),
    changeAmount: roundMoney(safePrice - previousClose),
    points: (points.length ? points : [previousClose, safePrice]).map(roundMoney),
  };
};

const withTimeout = async (url) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), QUOTE_FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const fetchYahooQuote = async (fallback) => {
  const symbol = normalizeSymbol(fallback?.symbol);
  const cached = quoteCache.get(symbol);
  if (cached && cached.expiresAt > Date.now()) return cached.quote;
  if (quoteRequests.has(symbol)) return quoteRequests.get(symbol);

  const request = (async () => {
    let quote = formatQuote(fallback, fallback?.points);
    try {
      const response = await withTimeout(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=5m`);
      if (response.ok) {
        const payload = await response.json();
        const result = payload.chart?.result?.[0];
        const close = result?.indicators?.quote?.[0]?.close?.filter(Number.isFinite) || [];
        const meta = result?.meta;
        const price = Number(meta?.regularMarketPrice || close.at(-1));
        if (Number.isFinite(price) && close.length >= 2) {
          const previousClose = Number(meta?.previousClose || close[0]);
          const changePercent = previousClose ? ((price - previousClose) / previousClose) * 100 : fallback.changePercent;
          quote = formatQuote({ ...fallback, price, previousClose, changePercent }, close);
        }
      }
    } catch (error) {
      console.warn(`Market quote unavailable for ${symbol}:`, error.message);
    }
    quoteCache.set(symbol, { quote, expiresAt: Date.now() + QUOTE_CACHE_TTL_MS });
    return quote;
  })().finally(() => quoteRequests.delete(symbol));

  quoteRequests.set(symbol, request);
  return request;
};

const normalizeSymbol = (value) => String(value || '').trim().toUpperCase().replace(/[^A-Z0-9.-]/g, '');

const fallbackSearchResults = (query) => {
  const normalizedQuery = query.toUpperCase();
  return fallbackQuotes
    .filter((quote) => quote.symbol.includes(normalizedQuery) || quote.name.toUpperCase().includes(normalizedQuery))
    .map((quote) => ({ symbol: quote.symbol, name: quote.name, exchange: 'US market' }));
};

const applyWatchlistChanges = (marketQuotes, configuredChanges = []) => {
  const changes = new Map(
    configuredChanges
      .map((item) => ({ symbol: normalizeSymbol(item?.symbol), changePercent: Number(item?.changePercent) }))
      .filter((item) => watchlistSymbols.has(item.symbol)
        && Number.isFinite(item.changePercent)
        && item.changePercent >= MIN_WATCHLIST_CHANGE_PERCENT
        && item.changePercent <= MAX_WATCHLIST_CHANGE_PERCENT)
      .map((item) => [item.symbol, item.changePercent]),
  );

  return marketQuotes.map((quote) => {
    if (!changes.has(quote.symbol)) return quote;
    const changePercent = changes.get(quote.symbol);
    const previousClose = quote.price / (1 + (changePercent / 100));
    return formatQuote({ ...quote, changePercent, previousClose }, [previousClose, ...(quote.points || []).slice(1)]);
  });
};

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

  const localResults = fallbackSearchResults(query);
  try {
    const response = await withTimeout(`https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=12&newsCount=0`);
    if (!response.ok) return res.json({ results: localResults });
    const payload = await response.json();
    const yahooResults = (payload.quotes || [])
      .filter((quote) => ['EQUITY', 'ETF'].includes(quote.quoteType) && ['NMS', 'NYQ', 'ASE', 'BTS', 'NGM', 'NCM', 'PCX', 'NASDAQ', 'NYSE'].includes(quote.exchange))
      .map((quote) => ({
        symbol: normalizeSymbol(quote.symbol),
        name: quote.longname || quote.shortname || quote.symbol,
        exchange: quote.exchDisp || 'US market',
      }))
      .filter((quote) => quote.symbol);
    const results = [...localResults, ...yahooResults]
      .filter((quote, index, all) => all.findIndex((candidate) => candidate.symbol === quote.symbol) === index)
      .slice(0, 10);
    return res.json({ results });
  } catch (error) {
    console.warn('Market symbol search unavailable:', error.message);
    return res.json({ results: localResults });
  }
});

router.get('/quote/:symbol', protect, async (req, res) => {
  try {
    const [quote, settings] = await Promise.all([fetchQuoteBySymbol(req.params.symbol), getSettings()]);
    if (!quote || !Number.isFinite(quote.price) || quote.price <= 0) {
      return res.status(404).json({ message: 'Quote not found for that US symbol.' });
    }
    res.json({ quote: applyWatchlistChanges([quote], settings.watchlistChanges)[0] });
  } catch (error) {
    console.error('Market quote error:', error);
    res.status(500).json({ message: 'Unable to load that market quote.' });
  }
});

const getSettings = async () => {
  try {
    return await MarketSettings.findOneAndUpdate(
      { key: 'primary' },
      { $setOnInsert: { key: 'primary' } },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
    );
  } catch (error) {
    // A simultaneous first request can lose the unique-key upsert race.
    // In that case the winning request has already created the singleton.
    if (error?.code === 11000) return MarketSettings.findOne({ key: 'primary' });
    throw error;
  }
};

const settingsPayload = (settings) => ({
  todaysReturnPercent: Number(settings?.todaysReturnPercent ?? 10.5),
  marketStatus: settings?.marketStatus === 'closed' ? 'closed' : 'open',
  marketMessage: settings?.marketMessage || 'Prices update during US market hours.',
  watchlistChanges: (settings?.watchlistChanges || []).map((item) => ({
    symbol: normalizeSymbol(item.symbol),
    changePercent: Number(item.changePercent),
  })).filter((item) => watchlistSymbols.has(item.symbol)
    && Number.isFinite(item.changePercent)
    && item.changePercent >= MIN_WATCHLIST_CHANGE_PERCENT
    && item.changePercent <= MAX_WATCHLIST_CHANGE_PERCENT),
  updatedAt: settings?.updatedAt,
});

// This lightweight endpoint keeps the administration console independent of
// slow third-party quote requests when it only needs persisted controls.
router.get('/settings', protect, requireRole('admin'), async (_req, res) => {
  try {
    res.json({ settings: settingsPayload(await getSettings()) });
  } catch (error) {
    console.error('Market settings read error:', error);
    res.status(500).json({ message: 'Unable to load market settings' });
  }
});

router.get('/overview', protect, async (req, res) => {
  try {
    const [settings, quotes, { estimatedTradeTotal, tradeCount }] = await Promise.all([
      getSettings(),
      Promise.all(fallbackQuotes.map(fetchYahooQuote)),
      // Scoped to the logged-in user only — this used to aggregate every
      // user's submitted orders together, which is why every customer saw
      // the exact same "today's return" number regardless of what they
      // personally had invested.
      getUserTradeTotal(req.user._id),
    ]);

    const globalReturnPercent = Number(settings.todaysReturnPercent ?? 10.5);
    const autoTodaysReturn = Number((estimatedTradeTotal * globalReturnPercent / 100).toFixed(2));

    // An admin can override this specific user's return with a dollar
    // figure (User.todaysReturnOverride). When set, the % shown is derived
    // live from what this user actually has on trade today, not frozen at
    // whatever it was when the admin saved the override.
    const hasOverride = Number.isFinite(req.user.todaysReturnOverride);
    const todaysReturn = hasOverride ? Number(req.user.todaysReturnOverride.toFixed(2)) : autoTodaysReturn;
    const todaysReturnPercent = hasOverride
      ? Number((estimatedTradeTotal > 0 ? (req.user.todaysReturnOverride / estimatedTradeTotal) * 100 : 0).toFixed(2))
      : globalReturnPercent;

    const displayQuotes = applyWatchlistChanges(quotes, settings.watchlistChanges);

    res.json({
      settings: {
        ...settingsPayload(settings),
        todaysReturn,
        todaysReturnPercent,
        estimatedTradeTotal,
        tradeCount,
      },
      balance: {
        checking: req.user.accounts?.find((account) => account.accountType === 'checking')?.balance || 0,
        total: req.user.balance || 0,
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
    const symbol = normalizeSymbol(req.body?.symbol);
    const quantity = Number(req.body?.quantity);
    if (!symbol || !Number.isFinite(quantity) || quantity < 0.0001 || quantity > 100000) {
      return res.status(400).json({ message: 'Choose a valid US symbol and a quantity between 0.0001 and 100,000.' });
    }
    const [settings, quote] = await Promise.all([getSettings(), fetchQuoteBySymbol(symbol)]);
    if (settings.marketStatus !== 'open') {
      return res.status(403).json({ message: 'Paper trading is unavailable while the market is closed.' });
    }
    if (!quote || !Number.isFinite(quote.price) || quote.price <= 0) {
      return res.status(400).json({ message: 'That symbol is not currently available for paper trading.' });
    }

    const total = Number((quote.price * quantity).toFixed(2));
    if (!Number.isFinite(total) || total <= 0) {
      return res.status(400).json({ message: 'The order total is invalid.' });
    }

    // Conditional atomic debit closes the race where two concurrent orders
    // could each see the same checking balance and overspend it.
    const debitedUser = await User.findOneAndUpdate(
      {
        _id: req.userId,
        accounts: { $elemMatch: { accountType: 'checking', balance: { $gte: total } } },
      },
      { $inc: { 'accounts.$.balance': -total, balance: -total } },
      { new: true },
    );
    if (!debitedUser) {
      const user = await User.findById(req.userId).select('accounts');
      const checking = user?.accounts?.find((account) => account.accountType === 'checking');
      const available = Number(checking?.balance || 0);
      return res.status(402).json({ message: `Insufficient checking balance. Available: $${available.toFixed(2)}.` });
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
      await User.updateOne(
        { _id: req.userId, 'accounts.accountType': 'checking' },
        { $inc: { 'accounts.$.balance': total, balance: total } },
      );
      throw writeError;
    }

    const remainingCheckingBalance = Number(
      debitedUser.accounts?.find((account) => account.accountType === 'checking')?.balance || 0,
    );

    res.status(201).json({
      message: 'Paper order confirmed and balance debited.',
      order: {
        id: order._id,
        symbol: order.symbol,
        quantity: order.quantity,
        referencePrice: order.referencePrice,
        total,
        remainingCheckingBalance,
        // Kept for older clients that displayed the user's total balance.
        remainingBalance: debitedUser.balance,
        status: order.status,
      },
    });
  } catch (error) {
    console.error('Market order error:', error);
    res.status(500).json({ message: error.message || 'Unable to submit order' });
  }
});

// Global market-wide controls: status, note, and per-symbol watchlist %.
// todaysReturnPercent here is the default rate applied to any user who
// doesn't have an individual override set (see /admin/users/:userId/return
// in routes/admin.js for the per-user override).
router.patch('/settings', protect, requireRole('admin'), async (req, res) => {
  try {
    const body = req.body || {};
    const todaysReturnPercent = Number(body.todaysReturnPercent);
    const marketStatus = body.marketStatus;
    const hasWatchlistChanges = Object.prototype.hasOwnProperty.call(body, 'watchlistChanges');
    if (!Number.isFinite(todaysReturnPercent) || !['open', 'closed'].includes(marketStatus)) {
      return res.status(400).json({ message: 'Enter a valid default return rate and market status.' });
    }
    if (body.marketMessage !== undefined && typeof body.marketMessage !== 'string') {
      return res.status(400).json({ message: 'Market note must be text.' });
    }
    const marketMessage = String(body.marketMessage || '').trim();
    if (marketMessage.length > 160) {
      return res.status(400).json({ message: 'Market note must be 160 characters or fewer.' });
    }

    let watchlistChanges;
    if (hasWatchlistChanges) {
      if (!Array.isArray(body.watchlistChanges)) {
        return res.status(400).json({ message: 'Watchlist changes must be a list.' });
      }
      const seenSymbols = new Set();
      watchlistChanges = [];
      for (const item of body.watchlistChanges) {
        const symbol = normalizeSymbol(item?.symbol);
        const changePercent = Number(item?.changePercent);
        if (!watchlistSymbols.has(symbol)) {
          return res.status(400).json({ message: `Unknown watchlist symbol: ${symbol || 'missing symbol'}.` });
        }
        if (seenSymbols.has(symbol)) {
          return res.status(400).json({ message: `Duplicate watchlist symbol: ${symbol}.` });
        }
        if (!Number.isFinite(changePercent)
          || changePercent < MIN_WATCHLIST_CHANGE_PERCENT
          || changePercent > MAX_WATCHLIST_CHANGE_PERCENT) {
          return res.status(400).json({ message: `Change for ${symbol} must be between ${MIN_WATCHLIST_CHANGE_PERCENT}% and ${MAX_WATCHLIST_CHANGE_PERCENT}%.` });
        }
        seenSymbols.add(symbol);
        watchlistChanges.push({ symbol, changePercent });
      }
    }

    const settings = await MarketSettings.findOneAndUpdate(
      { key: 'primary' },
      {
        $set: {
          todaysReturnPercent,
          marketStatus,
          marketMessage: marketMessage || 'Prices update during US market hours.',
          ...(hasWatchlistChanges ? { watchlistChanges } : {}),
          updatedBy: req.userId,
        },
        $setOnInsert: { key: 'primary' },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    res.json({ message: 'Market settings updated.', settings: settingsPayload(settings) });
  } catch (error) {
    console.error('Market settings update error:', error);
    res.status(500).json({ message: 'Unable to update market settings' });
  }
});

module.exports = router;
