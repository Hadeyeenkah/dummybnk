import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBankContext } from '../context/BankContext';
import AuroraBankLogo from '../components/AuroraBankLogo';
import { API_BASE } from '../config';
import '../App.css';

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

const money = (value) => Number(value || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const percent = (value) => `${Number(value || 0) >= 0 ? '+' : ''}${Number(value || 0).toFixed(2)}%`;

const applyWatchlistChanges = (marketQuotes, watchlistChanges = []) => {
  const changes = new Map(watchlistChanges.map((item) => [item.symbol, Number(item.changePercent)]));
  return marketQuotes.map((quote) => {
    if (!changes.has(quote.symbol)) return quote;
    const changePercent = changes.get(quote.symbol);
    const previousClose = changePercent <= -100 ? 0 : quote.price / (1 + changePercent / 100);
    return {
      ...quote,
      changePercent,
      previousClose: Number(previousClose.toFixed(2)),
      changeAmount: Number((quote.price - previousClose).toFixed(2)),
      points: quote.points?.length > 1 ? [Number(previousClose.toFixed(2)), ...quote.points.slice(1)] : [Number(previousClose.toFixed(2)), quote.price],
    };
  });
};

function PriceChart({ quote }) {
  const points = quote?.points?.length > 1 ? quote.points : [quote?.price || 0, quote?.price || 0];
  const min = Math.min(...points);
  const max = Math.max(...points);
  const spread = max - min || 1;
  const coordinates = points.map((value, index) => `${(index / (points.length - 1)) * 100},${100 - ((value - min) / spread) * 82 - 9}`).join(' ');
  const rising = points.at(-1) >= points[0];

  return (
    <div className="relative h-64 w-full overflow-hidden rounded-xl bg-[#f7fbff] p-3 sm:h-72" aria-label={`${quote.symbol} intraday price chart`}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full" role="img">
        <defs>
          <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={rising ? '#0b5a9d' : '#be123c'} stopOpacity="0.22" />
            <stop offset="100%" stopColor={rising ? '#0b5a9d' : '#be123c'} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[18, 45, 72].map((line) => <line key={line} x1="0" x2="100" y1={line} y2={line} stroke="#dbe7f2" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />)}
        <polygon points={`0,100 ${coordinates} 100,100`} fill="url(#chartFill)" />
        <polyline points={coordinates} fill="none" stroke={rising ? '#0b5a9d' : '#be123c'} strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="pointer-events-none absolute inset-x-4 bottom-2 flex justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400"><span>Open</span><span>Now</span></div>
    </div>
  );
}

function StockMarketPage() {
  const { currentUser } = useBankContext();
  const [quotes, setQuotes] = useState(fallbackQuotes);
  const [settings, setSettings] = useState({ todaysReturn: 0, todaysReturnPercent: 10.5, estimatedTradeTotal: 0, marketStatus: 'open', marketMessage: 'Prices update during US market hours.' });
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL');
  const [quantity, setQuantity] = useState('1');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [reviewOrder, setReviewOrder] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [availableBalance, setAvailableBalance] = useState(currentUser?.balance ?? 2500);
  const [successOrder, setSuccessOrder] = useState(null);

  const selectedQuote = useMemo(() => quotes.find((quote) => quote.symbol === selectedSymbol) || quotes[0], [quotes, selectedSymbol]);
  const estimatedOrderValue = Number(quantity || 0) * Number(selectedQuote?.price || 0);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    let active = true;
    const loadMarket = async () => {
      try {
        const response = await fetch(`${API_BASE}/market/overview`, { credentials: 'include', headers: getAuthHeaders() });
        if (!response.ok) throw new Error('Market data is unavailable right now.');
        const data = await response.json();
        if (active) {
          setSettings(data.settings || settings);
          setQuotes(applyWatchlistChanges(data.quotes?.length ? data.quotes : fallbackQuotes, data.settings?.watchlistChanges));
          if (data.balance) setAvailableBalance(Number(data.balance.checking ?? data.balance.total ?? 0));
        }
      } catch (loadError) {
        if (active) setError(loadError.message);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadMarket();
    const refreshTimer = setInterval(loadMarket, 30000);
    return () => {
      active = false;
      clearInterval(refreshTimer);
    };
    // Refresh quotes and admin-controlled percentages while the page is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReviewOrder = () => {
    const numericQuantity = Number(quantity);
    if (!selectedQuote || !Number.isFinite(numericQuantity) || numericQuantity <= 0) {
      setError('Enter a quantity greater than zero.');
      return;
    }
    setError('');
    setNotice('');
    setReviewOrder({
      symbol: selectedQuote.symbol,
      name: selectedQuote.name,
      quantity: numericQuantity,
      price: selectedQuote.price,
      total: numericQuantity * selectedQuote.price,
    });
  };

  const handleConfirmOrder = async () => {
    if (!reviewOrder) return;
    setSubmitting(true);
    setNotice('');
    setError('');
    try {
      const response = await fetch(`${API_BASE}/market/orders`, {
        method: 'POST',
        credentials: 'include',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: reviewOrder.symbol, quantity: reviewOrder.quantity }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Unable to submit order.');
      setAvailableBalance(data.order.remainingBalance);
      setSuccessOrder({
        quantity: reviewOrder.quantity,
        symbol: reviewOrder.symbol,
        price: data.order.referencePrice,
        total: data.order.total,
      });
      setNotice('');
      setReviewOrder(null);
    } catch (orderError) {
      setError(orderError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    setSearching(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/market/search?q=${encodeURIComponent(query)}`, { credentials: 'include', headers: getAuthHeaders() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to search the US market.');
      setSearchResults(data.results || []);
      if (!data.results?.length) setError('No US-listed stock or ETF matched that search. Bitcoin and other crypto assets are not supported on this stock page.');
    } catch (searchError) {
      setSearchResults([]);
      setError(searchError.message);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectSearchResult = async (result) => {
    setSearching(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/market/quote/${encodeURIComponent(result.symbol)}`, { credentials: 'include', headers: getAuthHeaders() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to load that symbol.');
      setQuotes((currentQuotes) => [data.quote, ...currentQuotes.filter((quote) => quote.symbol !== data.quote.symbol)]);
      setSelectedSymbol(data.quote.symbol);
      setSearchResults([]);
      setSearchQuery('');
    } catch (quoteError) {
      setError(quoteError.message);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white/90 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3"><AuroraBankLogo /><span className="truncate text-lg font-semibold tracking-tight text-[#102a43]">Aurora Bank</span></div>
          <Link to="/dashboard" className="shrink-0 text-sm font-semibold text-[#0b4f8a] hover:text-[#083b73]">Back to Dashboard</Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#436b96]">US equities</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-[#102a43] sm:text-4xl">Stock market</h1><p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">Track leading US-listed symbols and place paper orders at the latest reference price.</p></div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm"><span className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${settings.marketStatus === 'open' ? 'bg-emerald-500' : 'bg-slate-400'}`} /><span className="font-semibold text-[#102a43]">NYSE market {settings.marketStatus}</span></div>
        </div>

        {error && <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">{error}</div>}
        {notice && <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">{notice}</div>}

        <section className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Today&apos;s return</p><p className={`mt-2 text-2xl font-bold ${settings.todaysReturn >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{settings.todaysReturn >= 0 ? '+' : '-'}{money(Math.abs(settings.todaysReturn))}</p><p className="mt-1 text-xs text-slate-500">{percent(settings.todaysReturnPercent)} of {money(settings.estimatedTradeTotal)} in user trades</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Available to invest</p><p className="mt-2 text-2xl font-bold text-[#102a43]">{money(Number(availableBalance))}</p><p className="mt-1 text-xs text-slate-500">Checking balance</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Market note</p><p className="mt-2 text-base font-bold text-[#102a43]">{settings.marketMessage}</p><p className="mt-1 text-xs text-slate-500">{loading ? 'Loading current quotes...' : 'Reference data loaded'}</p></div>
        </section>

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-3"><h2 className="text-lg font-bold text-[#102a43]">Search the US market</h2><p className="mt-1 text-sm text-slate-500">Find US-listed stocks and ETFs by ticker or company name.</p></div>
          <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
            <label htmlFor="market-search" className="sr-only">Search ticker or company</label>
            <input id="market-search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Try TSLA, Amazon, or an ETF" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#0b5a9d] focus:ring-4 focus:ring-[#0b5a9d]/10" />
            <button type="submit" disabled={searching || !searchQuery.trim()} className="rounded-lg bg-[#0b5a9d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#083b73] disabled:cursor-not-allowed disabled:opacity-60">{searching ? 'Searching...' : 'Search symbols'}</button>
          </form>
          {searchResults.length > 0 && <div className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">{searchResults.map((result) => <button type="button" key={`${result.symbol}-${result.exchange}`} onClick={() => handleSelectSearchResult(result)} className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-[#f8fbff]"><span className="min-w-0"><span className="font-bold text-[#102a43]">{result.symbol}</span><span className="ml-3 truncate text-sm text-slate-500">{result.name}</span></span><span className="shrink-0 text-xs font-semibold text-[#436b96]">{result.exchange}</span></button>)}</div>}
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 px-5 py-5 sm:px-6"><h2 className="text-lg font-bold text-[#102a43]">Market watchlist</h2><p className="mt-1 text-sm text-slate-500">Select a symbol to inspect its intraday movement.</p></div><div className="divide-y divide-slate-100">{quotes.map((quote) => <button type="button" key={quote.symbol} onClick={() => setSelectedSymbol(quote.symbol)} className={`flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-[#f8fbff] sm:px-6 ${selectedQuote?.symbol === quote.symbol ? 'bg-[#f2f8fd]' : ''}`}><div className="flex min-w-0 items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e9f1fb] text-xs font-bold text-[#0b5a9d]">{quote.symbol.slice(0, 2)}</div><div className="min-w-0"><p className="font-bold text-[#102a43]">{quote.symbol}</p><p className="truncate text-sm text-slate-500">{quote.name}</p></div></div><div className="text-right"><p className="font-bold tabular-nums text-[#102a43]">{money(quote.price)}</p><p className={`text-xs font-semibold ${quote.changePercent >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{percent(quote.changePercent)} <span className="font-normal text-slate-400">({money(quote.changeAmount)})</span></p></div></button>)}</div></section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="mb-5 flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#436b96]">Selected symbol</p><h2 className="mt-1 text-2xl font-bold text-[#102a43]">{selectedQuote?.symbol}</h2><p className="text-sm text-slate-500">{selectedQuote?.name}</p></div><div className="text-right"><p className="text-xl font-bold text-[#102a43]">{money(selectedQuote?.price)}</p><p className={`text-xs font-semibold ${selectedQuote?.changePercent >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{percent(selectedQuote?.changePercent)} <span className="font-normal text-slate-400">({money(selectedQuote?.changeAmount)})</span></p></div></div><PriceChart quote={selectedQuote} /><div className="mt-5 border-t border-slate-100 pt-5"><label htmlFor="quantity" className="text-sm font-semibold text-[#102a43]">Shares to buy</label><div className="mt-2 flex gap-3"><input id="quantity" type="number" min="0.0001" step="0.0001" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#0b5a9d] focus:ring-4 focus:ring-[#0b5a9d]/10" /><button type="button" onClick={handleReviewOrder} disabled={submitting || loading} className="rounded-lg bg-[#0b5a9d] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#083b73] disabled:cursor-not-allowed disabled:opacity-60">Review buy</button></div><p className="mt-2 text-xs text-slate-500">Estimated value: {money(estimatedOrderValue)}</p></div></section>
        </div>

        {reviewOrder && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="order-review-title"><section className="my-auto w-full max-w-2xl rounded-2xl border border-[#8bb5dd] bg-white p-5 shadow-2xl sm:p-6"><div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#436b96]">Order review</p><h2 id="order-review-title" className="mt-1 text-xl font-bold text-[#102a43]">Review your buy order</h2><p className="mt-1 text-sm text-slate-500">Check the details before confirming.</p></div><button type="button" onClick={() => setReviewOrder(null)} className="self-start text-sm font-semibold text-slate-500 hover:text-[#102a43]">Cancel</button></div><div className="mt-5 grid gap-3 text-sm sm:grid-cols-4"><div className="rounded-xl bg-slate-50 p-4"><p className="text-slate-500">Investment</p><p className="mt-1 font-bold text-[#102a43]">{reviewOrder.symbol}</p><p className="text-xs text-slate-500">{reviewOrder.name}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-slate-500">Shares</p><p className="mt-1 font-bold text-[#102a43]">{reviewOrder.quantity}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-slate-500">Reference price</p><p className="mt-1 font-bold text-[#102a43]">{money(reviewOrder.price)}</p></div><div className="rounded-xl bg-[#eef7ff] p-4"><p className="text-[#436b96]">Estimated total</p><p className="mt-1 font-bold text-[#0b5a9d]">{money(reviewOrder.total)}</p></div></div><div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-5 text-slate-500">Funding source: Checking balance. {money(reviewOrder.total)} will be debited when confirmed.</p><button type="button" onClick={handleConfirmOrder} disabled={submitting} className="rounded-lg bg-[#0b5a9d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#083b73] disabled:cursor-not-allowed disabled:opacity-60">{submitting ? 'Confirming...' : 'Confirm buy order'}</button></div></section></div>}

        {successOrder && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="order-success-title"><section className="w-full max-w-md rounded-2xl border border-emerald-200 bg-white p-6 text-center shadow-2xl sm:p-8"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><svg className="h-9 w-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12.5 9.5 17 19 7.5" /></svg></div><p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Order successful</p><h2 id="order-success-title" className="mt-2 text-2xl font-bold text-[#102a43]">Buy order confirmed</h2><p className="mt-4 text-base leading-7 text-slate-700"><span className="font-bold">{successOrder.quantity} share{successOrder.quantity === 1 ? '' : 's'} of {successOrder.symbol} confirmed at {money(successOrder.price)}.</span><br />{money(successOrder.total)} was debited from checking.</p><button type="button" onClick={() => setSuccessOrder(null)} className="mt-7 w-full rounded-lg bg-[#0b5a9d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#083b73] focus:outline-none focus:ring-4 focus:ring-[#0b5a9d]/20">Done</button></section></div>}

        <p className="mt-6 text-xs leading-5 text-slate-500">Reference quotes are for product demonstration and may be delayed. Paper orders do not purchase securities or move bank funds. Investments are not FDIC insured, are not bank guaranteed, and may lose value.</p>
      </main>
    </div>
  );
}

export default StockMarketPage;
