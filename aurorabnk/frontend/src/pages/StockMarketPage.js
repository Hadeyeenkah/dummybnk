import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBankContext } from '../context/BankContext';
import AuroraBankLogo from '../components/AuroraBankLogo';
import { API_BASE } from '../config';
import '../App.css';

/*
  Design notes for whoever picks this up next:
  - Palette: ink #10182B, paper #F3F4EF, surface #FFFFFF, hairline #D9DBD2,
    brand forest #163B2E, accent gold #A9843C, gains #1E7245, losses #9B3232.
  - Headlines use a serif stack (financial-press feel); UI text stays on the
    system sans stack. Prices use tabular-nums so figures stay aligned.
  - If you want the exact serif webfont, add to index.html:
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&display=swap" rel="stylesheet">
    and set --font-serif: 'Source Serif 4', Georgia, serif in App.css.
*/

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

function MarketTicker({ quotes }) {
  // Duplicate the list once so the marquee loops seamlessly at -50%.
  const strip = [...quotes, ...quotes];
  return (
    <div className="relative overflow-hidden border-y border-[#28394f] bg-[#10182B] py-2.5">
      <style>{`
        @keyframes aurora-ticker-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .aurora-ticker-track { animation: aurora-ticker-scroll 42s linear infinite; }
        @media (prefers-reduced-motion: reduce) { .aurora-ticker-track { animation: none; } }
      `}</style>
      <div className="flex w-max aurora-ticker-track">
        {strip.map((quote, index) => (
          <span key={`${quote.symbol}-${index}`} className="mx-5 flex shrink-0 items-baseline gap-2 whitespace-nowrap text-sm">
            <span className="font-semibold text-[#f3f4ef]">{quote.symbol}</span>
            <span className="tabular-nums text-[#c7ccd6]">{money(quote.price)}</span>
            <span className={`tabular-nums font-medium ${quote.changePercent >= 0 ? 'text-[#5fbd8a]' : 'text-[#e28787]'}`}>{percent(quote.changePercent)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function PriceChart({ quote }) {
  const points = quote?.points?.length > 1 ? quote.points : [quote?.price || 0, quote?.price || 0];
  const min = Math.min(...points);
  const max = Math.max(...points);
  const spread = max - min || 1;
  const coordinates = points.map((value, index) => `${(index / (points.length - 1)) * 100},${100 - ((value - min) / spread) * 82 - 9}`).join(' ');
  const rising = points.at(-1) >= points[0];
  const lineColor = rising ? '#1E7245' : '#9B3232';

  return (
    <div className="relative h-64 w-full overflow-hidden border border-[#D9DBD2] bg-[#FAFAF7] p-3 sm:h-72" aria-label={`${quote.symbol} intraday price chart`}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full" role="img">
        <defs>
          <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.16" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[18, 45, 72].map((line) => <line key={line} x1="0" x2="100" y1={line} y2={line} stroke="#e3e5dd" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />)}
        <polygon points={`0,100 ${coordinates} 100,100`} fill="url(#chartFill)" />
        <polyline points={coordinates} fill="none" stroke={lineColor} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="pointer-events-none absolute inset-x-3 bottom-2 flex justify-between text-[11px] font-medium text-[#8b8f83]">
        <span>Open</span><span>Now</span>
      </div>
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
    <div className="min-h-screen bg-[#F3F4EF] text-[#10182B]">
      <header className="bg-[#163B2E] text-[#F3F4EF]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <AuroraBankLogo />
            <span className="truncate font-serif text-lg font-semibold tracking-tight" style={{ fontFamily: "'Iowan Old Style', 'Source Serif 4', Georgia, serif" }}>Aurora Bank</span>
          </div>
          <Link to="/dashboard" className="shrink-0 rounded-md border border-[#3d5a4c] px-3 py-1.5 text-sm font-medium text-[#dfe6de] transition hover:border-[#6e8c7c] hover:text-white">
            Back to dashboard
          </Link>
        </div>
      </header>

      <MarketTicker quotes={quotes} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm text-[#5b6459]">Markets / US equities</p>
            <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight sm:text-[2.5rem]" style={{ fontFamily: "'Iowan Old Style', 'Source Serif 4', Georgia, serif" }}>
              Stock market
            </h1>
            <p className="mt-2 max-w-xl text-[15px] leading-6 text-[#4b5346]">
              Track leading US-listed symbols and place paper orders at the latest reference price.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start border border-[#D9DBD2] bg-white px-4 py-2.5 text-sm sm:self-auto">
            <span className={`inline-block h-2 w-2 rounded-full ${settings.marketStatus === 'open' ? 'bg-[#1E7245]' : 'bg-[#9a9d92]'}`} />
            <span className="font-medium">NYSE market {settings.marketStatus}</span>
          </div>
        </div>

        {error && (
          <div className="mb-5 border border-[#e3b3b3] bg-[#fbf1f1] px-4 py-3 text-sm text-[#7a2b2b]" role="alert">{error}</div>
        )}
        {notice && (
          <div className="mb-5 border border-[#bcdcc6] bg-[#f0f8f2] px-4 py-3 text-sm text-[#1E7245]" role="status">{notice}</div>
        )}

        <section className="mb-8 grid gap-px overflow-hidden border border-[#D9DBD2] bg-[#D9DBD2] sm:grid-cols-3">
          <div className="bg-white p-5">
            <p className="text-sm text-[#5b6459]">Today&apos;s return</p>
            <p className={`mt-2 text-2xl font-semibold tabular-nums ${settings.todaysReturn >= 0 ? 'text-[#1E7245]' : 'text-[#9B3232]'}`}>
              {settings.todaysReturn >= 0 ? '+' : '-'}{money(Math.abs(settings.todaysReturn))}
            </p>
            <p className="mt-1 text-xs text-[#8a9081]">{percent(settings.todaysReturnPercent)} of {money(settings.estimatedTradeTotal)} in user trades</p>
          </div>
          <div className="bg-white p-5">
            <p className="text-sm text-[#5b6459]">Available to invest</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{money(Number(availableBalance))}</p>
            <p className="mt-1 text-xs text-[#8a9081]">Checking balance</p>
          </div>
          <div className="bg-white p-5">
            <p className="text-sm text-[#5b6459]">Market note</p>
            <p className="mt-2 text-base font-medium">{settings.marketMessage}</p>
            <p className="mt-1 text-xs text-[#8a9081]">{loading ? 'Loading current quotes…' : 'Reference data loaded'}</p>
          </div>
        </section>

        <section className="mb-6 border border-[#D9DBD2] bg-white p-5 sm:p-6">
          <div className="mb-3">
            <h2 className="text-lg font-semibold">Search the US market</h2>
            <p className="mt-1 text-sm text-[#5b6459]">Find US-listed stocks and ETFs by ticker or company name.</p>
          </div>
          <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
            <label htmlFor="market-search" className="sr-only">Search ticker or company</label>
            <input
              id="market-search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Try TSLA, Amazon, or an ETF"
              className="min-w-0 flex-1 rounded-md border border-[#c7ccc0] px-4 py-3 text-sm outline-none focus:border-[#163B2E] focus:ring-2 focus:ring-[#163B2E]/15"
            />
            <button
              type="submit"
              disabled={searching || !searchQuery.trim()}
              className="rounded-md bg-[#163B2E] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0F2C22] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {searching ? 'Searching…' : 'Search symbols'}
            </button>
          </form>
          {searchResults.length > 0 && (
            <div className="mt-3 divide-y divide-[#e6e8e0] border border-[#e6e8e0]">
              {searchResults.map((result) => (
                <button
                  type="button"
                  key={`${result.symbol}-${result.exchange}`}
                  onClick={() => handleSelectSearchResult(result)}
                  className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-[#F7F7F3]"
                >
                  <span className="min-w-0">
                    <span className="font-semibold">{result.symbol}</span>
                    <span className="ml-3 truncate text-sm text-[#5b6459]">{result.name}</span>
                  </span>
                  <span className="shrink-0 text-xs font-medium text-[#8a9081]">{result.exchange}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="overflow-hidden border border-[#D9DBD2] bg-white">
            <div className="border-b border-[#D9DBD2] px-5 py-5 sm:px-6">
              <h2 className="text-lg font-semibold">Market watchlist</h2>
              <p className="mt-1 text-sm text-[#5b6459]">Select a symbol to inspect its intraday movement.</p>
            </div>
            <div className="divide-y divide-[#ECEDE7]">
              {quotes.map((quote) => {
                const isSelected = selectedQuote?.symbol === quote.symbol;
                return (
                  <button
                    type="button"
                    key={quote.symbol}
                    onClick={() => setSelectedSymbol(quote.symbol)}
                    className={`flex w-full items-center justify-between gap-4 border-l-2 px-5 py-4 text-left transition hover:bg-[#FAFAF7] sm:px-6 ${isSelected ? 'border-[#A9843C] bg-[#FAFAF7]' : 'border-transparent'}`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#10182B] text-xs font-bold text-white">
                        {quote.symbol.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold">{quote.symbol}</p>
                        <p className="truncate text-sm text-[#5b6459]">{quote.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold tabular-nums">{money(quote.price)}</p>
                      <p className={`text-xs font-medium tabular-nums ${quote.changePercent >= 0 ? 'text-[#1E7245]' : 'text-[#9B3232]'}`}>
                        {percent(quote.changePercent)} <span className="font-normal text-[#8a9081]">({money(quote.changeAmount)})</span>
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="border border-[#D9DBD2] bg-white p-5 sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-[#5b6459]">Selected symbol</p>
                <h2 className="mt-1 font-serif text-2xl font-semibold" style={{ fontFamily: "'Iowan Old Style', 'Source Serif 4', Georgia, serif" }}>{selectedQuote?.symbol}</h2>
                <p className="text-sm text-[#5b6459]">{selectedQuote?.name}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-semibold tabular-nums">{money(selectedQuote?.price)}</p>
                <p className={`text-xs font-medium tabular-nums ${selectedQuote?.changePercent >= 0 ? 'text-[#1E7245]' : 'text-[#9B3232]'}`}>
                  {percent(selectedQuote?.changePercent)} <span className="font-normal text-[#8a9081]">({money(selectedQuote?.changeAmount)})</span>
                </p>
              </div>
            </div>

            <PriceChart quote={selectedQuote} />

            <div className="mt-5 border-t border-[#ECEDE7] pt-5">
              <label htmlFor="quantity" className="text-sm font-semibold">Shares to buy</label>
              <div className="mt-2 flex gap-3">
                <input
                  id="quantity"
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  className="min-w-0 flex-1 rounded-md border border-[#c7ccc0] px-3 py-2.5 text-sm tabular-nums outline-none focus:border-[#163B2E] focus:ring-2 focus:ring-[#163B2E]/15"
                />
                <button
                  type="button"
                  onClick={handleReviewOrder}
                  disabled={submitting || loading}
                  className="rounded-md bg-[#163B2E] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0F2C22] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Review buy
                </button>
              </div>
              <p className="mt-2 text-xs text-[#8a9081]">Estimated value: {money(estimatedOrderValue)}</p>
            </div>
          </section>
        </div>

        {reviewOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#10182B]/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="order-review-title">
            <section className="my-auto w-full max-w-2xl rounded-lg border-t-4 border-[#A9843C] bg-white p-5 shadow-xl sm:p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm text-[#5b6459]">Order review</p>
                  <h2 id="order-review-title" className="mt-1 text-xl font-semibold">Review your buy order</h2>
                  <p className="mt-1 text-sm text-[#5b6459]">Check the details before confirming.</p>
                </div>
                <button type="button" onClick={() => setReviewOrder(null)} className="self-start text-sm font-medium text-[#5b6459] hover:text-[#10182B]">
                  Cancel
                </button>
              </div>
              <div className="mt-5 grid gap-px overflow-hidden border border-[#ECEDE7] bg-[#ECEDE7] text-sm sm:grid-cols-4">
                <div className="bg-[#FAFAF7] p-4">
                  <p className="text-[#5b6459]">Investment</p>
                  <p className="mt-1 font-semibold">{reviewOrder.symbol}</p>
                  <p className="text-xs text-[#8a9081]">{reviewOrder.name}</p>
                </div>
                <div className="bg-[#FAFAF7] p-4">
                  <p className="text-[#5b6459]">Shares</p>
                  <p className="mt-1 font-semibold tabular-nums">{reviewOrder.quantity}</p>
                </div>
                <div className="bg-[#FAFAF7] p-4">
                  <p className="text-[#5b6459]">Reference price</p>
                  <p className="mt-1 font-semibold tabular-nums">{money(reviewOrder.price)}</p>
                </div>
                <div className="bg-[#FBF6EC] p-4">
                  <p className="text-[#8a6c2e]">Estimated total</p>
                  <p className="mt-1 font-semibold tabular-nums text-[#8a6c2e]">{money(reviewOrder.total)}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-3 border-t border-[#ECEDE7] pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-[#8a9081]">Funding source: checking balance. {money(reviewOrder.total)} will be debited when confirmed.</p>
                <button
                  type="button"
                  onClick={handleConfirmOrder}
                  disabled={submitting}
                  className="rounded-md bg-[#163B2E] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0F2C22] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? 'Confirming…' : 'Confirm buy order'}
                </button>
              </div>
            </section>
          </div>
        )}

        {successOrder && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#10182B]/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="order-success-title">
            <section className="w-full max-w-md rounded-lg border-t-4 border-[#1E7245] bg-white p-6 text-center shadow-xl sm:p-8">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#E8F3EC] text-[#1E7245]">
                <svg className="h-9 w-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12.5 9.5 17 19 7.5" />
                </svg>
              </div>
              <p className="mt-5 text-sm font-medium text-[#1E7245]">Order successful</p>
              <h2 id="order-success-title" className="mt-2 font-serif text-2xl font-semibold" style={{ fontFamily: "'Iowan Old Style', 'Source Serif 4', Georgia, serif" }}>
                Buy order confirmed
              </h2>
              <p className="mt-4 text-base leading-7 text-[#333d2e]">
                <span className="font-semibold">{successOrder.quantity} share{successOrder.quantity === 1 ? '' : 's'} of {successOrder.symbol} confirmed at {money(successOrder.price)}.</span>
                <br />{money(successOrder.total)} was debited from checking.
              </p>
              <button
                type="button"
                onClick={() => setSuccessOrder(null)}
                className="mt-7 w-full rounded-md bg-[#163B2E] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0F2C22] focus:outline-none focus:ring-2 focus:ring-[#163B2E]/20"
              >
                Done
              </button>
            </section>
          </div>
        )}

        <p className="mt-6 text-xs leading-5 text-[#8a9081]">
          Reference quotes are for product demonstration and may be delayed. Paper orders do not purchase securities or move bank funds. Investments are not FDIC insured, are not bank guaranteed, and may lose value.
        </p>
      </main>
    </div>
  );
}

export default StockMarketPage;
