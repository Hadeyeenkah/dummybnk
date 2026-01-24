import { Routes, Route, Link, Navigate } from 'react-router-dom';
import { BankProvider } from './context/BankContext';
import { useBankContext } from './context/BankContext';
import LoginPage from './LoginPage';
import SignupPage from './SignupPage';
import Dashboard from './Dashboard';
import TransferPage from './pages/TransferPage';
import WireTransferPage from './pages/WireTransferPage';
import BillsPage from './pages/BillsPage';
import TransactionsPage from './pages/TransactionsPage';
import AdminPage from './pages/AdminPage';
import DepositPage from './pages/DepositPage';
import CardsPage from './pages/CardsPage';
import SecurityPage from './pages/SecurityPage';
import NotificationsPage from './pages/NotificationsPage';
import AboutPage from './pages/AboutPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import AuroraBankLogo from './components/AuroraBankLogo';
import Footer from './components/Footer';
import './App.css';

const stats = [
  { label: 'Est.', value: '1921' },
  { label: 'Customers', value: '2.3M+' },
  { label: 'Daily Transactions', value: '4.1M' },
  { label: 'FDIC Insured', value: '$250K' },
];

const products = [
  {
    title: 'Everyday Checking',
    desc: 'No hidden fees, free ATM network, and instant card controls.',
    cta: 'Open Account',
  },
  {
    title: 'High-Yield Savings',
    desc: 'Earn up to 4.15% APY. FDIC insured up to $250,000 per depositor.',
    cta: 'Start Saving',
  },
  {
    title: 'Global Debit',
    desc: 'Zero foreign transaction fees with real-time FX alerts.',
    cta: 'Get the Card',
  },
];

const features = [
  {
    title: 'Real-time insights',
    desc: 'Smart notifications, spend analytics, and projected cash flow.',
  },
  {
    title: 'Security first',
    desc: 'Biometric sign-in, card freezes, and 24/7 fraud monitoring.',
  },
  {
    title: 'Human help, fast',
    desc: 'Talk to a specialist in under two minutes—anytime.',
  },
];

function App() {
  return (
    <BankProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/transfer" element={<RequireAuth><TransferPage /></RequireAuth>} />
        <Route path="/wire-transfer" element={<RequireAuth><WireTransferPage /></RequireAuth>} />
        <Route path="/bills" element={<RequireAuth><BillsPage /></RequireAuth>} />
        <Route path="/transactions" element={<RequireAuth><TransactionsPage /></RequireAuth>} />
        <Route path="/admin" element={<RequireAuth><AdminPage /></RequireAuth>} />
        <Route path="/deposit" element={<RequireAuth><DepositPage /></RequireAuth>} />
        <Route path="/cards" element={<RequireAuth><CardsPage /></RequireAuth>} />
        <Route path="/security" element={<RequireAuth><SecurityPage /></RequireAuth>} />
        <Route path="/notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />
        <Route path="/about" element={<AboutPage />} />
      </Routes>
    </BankProvider>
  );
}

function RequireAuth({ children }) {
  const { isAuthenticated, isInitializing } = useBankContext();
  
  // Show nothing while checking auth status
  if (isInitializing) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-slate-400">Loading...</div>
    </div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 gradient-veil" />
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="text-cyan-400">
              <AuroraBankLogo />
            </div>
            <span className="text-lg font-semibold tracking-tight">Aurora Bank, FSB</span>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-slate-200 md:flex">
            <a className="hover:text-white" href="#products">Products</a>
            <a className="hover:text-white" href="#features">Features</a>
            <Link to="/about" className="hover:text-white">About</Link>
            <a className="hover:text-white" href="#support">Support</a>
            <Link to="/login" className="rounded-full border border-cyan-300/50 px-4 py-2 text-cyan-50 hover:border-cyan-200 hover:text-white">
              Sign In
            </Link>
          </nav>
        </div>

        <section className="mx-auto max-w-6xl px-6 pb-16 pt-8 md:pb-24 md:pt-12">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div className="space-y-6">
              <p className="inline-flex items-center gap-2 rounded-full border border-cyan-200/30 bg-cyan-300/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-cyan-50">
                Modern banking, human service
              </p>
              <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
                Banking that moves
                <span className="text-cyan-300"> faster </span>
                than your life.
              </h1>
              <p className="text-lg text-slate-200 md:text-xl">
                Build savings, spend globally, and move money in real time. Trusted since 1921. Member FDIC.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/signup" className="rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-400/30 transition hover:translate-y-0.5">
                  Get Started
                </Link>
                <Link to="/login" className="rounded-full border border-slate-700 px-5 py-3 text-sm font-semibold text-white transition hover:border-cyan-300 hover:text-cyan-100">
                  Sign In
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-4 rounded-2xl border border-white/5 bg-white/5 p-4 backdrop-blur">
                {stats.map((item) => (
                  <div key={item.label} className="rounded-xl border border-white/5 bg-white/5 p-4 shadow-sm">
                    <div className="text-2xl font-semibold text-white">{item.value}</div>
                    <div className="text-sm text-slate-300">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              {/* Phone mockup with app interface */}
              <div className="relative mx-auto max-w-sm">
                <div className="relative z-10 overflow-hidden rounded-[2.5rem] border-8 border-slate-800 bg-slate-900 shadow-2xl">
                  <div className="h-6 bg-slate-900 flex items-center justify-center gap-2">
                    <div className="h-1 w-16 rounded-full bg-slate-700" />
                  </div>
                  <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 pb-8">
                    {/* Credit Card Visual */}
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-600 to-purple-700 p-6 shadow-2xl mb-4">
                      <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                      <div className="relative z-10">
                        <div className="flex justify-between items-start mb-8">
                          <svg className="w-10 h-10 text-white/90" fill="currentColor" viewBox="0 0 24 24">
                            <rect width="18" height="14" x="3" y="5" rx="2" />
                            <path d="M3 10h18" stroke="currentColor" strokeWidth="2" fill="none"/>
                          </svg>
                          <span className="text-white/90 font-bold text-sm">VISA</span>
                        </div>
                        <div className="space-y-2">
                          <div className="text-white font-mono text-lg tracking-wider">
                            •••• •••• •••• 8492
                          </div>
                          <div className="flex justify-between text-white/90 text-xs">
                            <span>AURORA PREMIUM</span>
                            <span>12/26</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Account Balance Card */}
                    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5 mb-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-xs uppercase tracking-wider text-slate-400">Total Balance</p>
                          <p className="mt-1 text-3xl font-bold text-white">$48,920.15</p>
                        </div>
                        <div className="rounded-full bg-green-500/20 px-3 py-1">
                          <span className="text-green-400 text-xs font-semibold">+12.5%</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
                        <div>
                          <p className="text-xs text-slate-400">Checking</p>
                          <p className="text-white font-semibold">$18,400</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Savings</p>
                          <p className="text-white font-semibold">$30,520</p>
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-4 gap-3 mb-4">
                      {[
                        { icon: '↗', label: 'Send', color: 'cyan' },
                        { icon: '↙', label: 'Request', color: 'purple' },
                        { icon: '💳', label: 'Cards', color: 'blue' },
                        { icon: '📊', label: 'Stats', color: 'green' }
                      ].map((action) => (
                        <div key={action.label} className="text-center">
                          <div className={`mx-auto w-12 h-12 rounded-xl bg-${action.color}-500/20 flex items-center justify-center mb-1 text-lg`}>
                            {action.icon}
                          </div>
                          <p className="text-xs text-slate-400">{action.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Recent Transactions */}
                    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4">
                      <p className="text-xs text-slate-400 mb-3">Recent Activity</p>
                      <div className="space-y-3">
                        {[
                          { icon: '🛒', name: 'Whole Foods', amount: '-$84.32', color: 'red' },
                          { icon: '💰', name: 'Salary Deposit', amount: '+$3,200', color: 'green' },
                          { icon: '☕', name: 'Starbucks', amount: '-$5.40', color: 'red' }
                        ].map((tx, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm">
                                {tx.icon}
                              </div>
                              <span className="text-sm text-white">{tx.name}</span>
                            </div>
                            <span className={`text-sm font-semibold ${tx.color === 'green' ? 'text-green-400' : 'text-red-400'}`}>
                              {tx.amount}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                {/* Phone shadow */}
                <div className="absolute inset-0 -z-10 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 blur-3xl" />
              </div>
            </div>
          </div>
        </section>
      </header>

      <main className="space-y-20 bg-slate-950 pb-20">
        <section id="products" className="mx-auto max-w-6xl px-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-cyan-200">Products</p>
              <h2 className="mt-2 text-3xl font-semibold text-white">Banking built to flex</h2>
            </div>
            <a className="text-sm text-cyan-200 hover:text-cyan-100" href="/#products">See all</a>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {products.map((product, index) => {
              const icons = [
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>,
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>,
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ];
              return (
                <div key={product.title} className="group rounded-2xl border border-white/5 bg-white/5 p-6 shadow-sm transition hover:-translate-y-1 hover:border-cyan-200/50 hover:bg-white/10">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 text-cyan-300">
                    {icons[index]}
                  </div>
                  <h3 className="mt-4 text-xl font-semibold text-white">{product.title}</h3>
                  <p className="mt-2 text-sm text-slate-300">{product.desc}</p>
                  <button className="mt-4 text-sm font-semibold text-cyan-200 transition group-hover:text-cyan-100 flex items-center gap-2">
                    {product.cta}
                    <span>→</span>
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-6">
          <div className="grid gap-10 rounded-3xl border border-white/5 bg-gradient-to-r from-slate-900 to-slate-800 p-10 shadow-lg">
            <div className="flex items-start justify-between gap-6 flex-col md:flex-row">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-cyan-200">Why Aurora</p>
                <h2 className="mt-3 text-3xl font-semibold text-white">Built for speed and safety</h2>
                <p className="mt-3 max-w-2xl text-slate-200">
                  Our platform is cloud-native with layered security, so you get instant transfers without sacrificing protection.
                </p>
              </div>
              <button className="rounded-full border border-cyan-200/40 px-5 py-2 text-sm font-semibold text-cyan-100 hover:border-cyan-200">Security Whitepaper</button>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {features.map((feature, index) => {
                const icons = [
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>,
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>,
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                  </svg>
                ];
                return (
                  <div key={feature.title} className="rounded-2xl border border-white/5 bg-white/5 p-6 hover:bg-white/10 transition">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 text-cyan-300 mb-4">
                      {icons[index]}
                    </div>
                    <div className="text-sm uppercase tracking-[0.2em] text-cyan-200 font-semibold">{feature.title}</div>
                    <p className="mt-3 text-sm text-slate-200">{feature.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="support" className="mx-auto max-w-6xl px-6">
          <div className="grid items-center gap-8 rounded-3xl border border-white/5 bg-slate-900 p-10">
            <div className="space-y-3">
              <p className="text-sm uppercase tracking-[0.2em] text-cyan-200">24/7 Support</p>
              <h2 className="text-3xl font-semibold text-white">Humans on standby</h2>
              <p className="text-slate-200">
                Reach us by chat, phone, or email anytime. Average first response under two minutes.
              </p>
              <div className="flex flex-wrap gap-3 text-sm text-slate-200">
                <span className="rounded-full bg-white/5 px-3 py-2">US +1 (800) 555-1042</span>
                <span className="rounded-full bg-white/5 px-3 py-2">support@aurorabank.com</span>
                <span className="rounded-full bg-white/5 px-3 py-2">In-app chat</span>
              </div>
            </div>
            <div className="rounded-2xl border border-cyan-200/30 bg-cyan-300/5 p-6">
              <p className="text-sm text-cyan-100">Customer stories</p>
              <p className="mt-3 text-xl font-semibold text-white">“Aurora moved our payroll across 4 countries in seconds.”</p>
              <p className="mt-3 text-sm text-slate-300">— Lena Ortiz, CFO at Northwind Studio</p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default App;