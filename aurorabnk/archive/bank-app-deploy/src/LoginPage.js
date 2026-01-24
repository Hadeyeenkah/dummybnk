import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useBankContext } from './context/BankContext';
import AuroraBankLogo from './components/AuroraBankLogo';
import './App.css';
import API_URL from './config';

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useBankContext();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await login(formData.email, formData.password);
    if (result.success) {
      // Use the user role returned from login to determine redirect
      if (result.user?.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } else {
      setError(result.message || 'Invalid email or password');
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotMessage('');
    setIsSubmitting(true);

    try {
      const apiBase = process.env.REACT_APP_API_BASE || API_URL || '/api';

      const res = await fetch(`${apiBase}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });

      // Check if response is JSON
      const contentType = res.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        const text = await res.text();
        console.error('❌ Non-JSON response:', text.substring(0, 200));
        setForgotError('Server error - invalid response');
        return;
      }

      const data = await res.json();

      if (res.ok) {
        setForgotMessage(data.message || 'Password reset link has been sent to your email.');
        setForgotEmail('');
        // Auto-close modal after 3 seconds
        setTimeout(() => {
          setShowForgotPassword(false);
          setForgotMessage('');
        }, 5000);
      } else {
        setForgotError(data.message || 'Failed to send reset link');
      }
    } catch (err) {
      console.error('❌ Error:', err);
      setForgotError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="absolute inset-0 -z-10 gradient-veil" />

      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3 text-cyan-400">
          <AuroraBankLogo />
          <span className="text-lg font-semibold tracking-tight text-slate-50">Aurora Bank, FSB</span>
        </div>
        <div className="flex gap-3 items-center">
          <Link to="/about" className="text-sm text-slate-300 hover:text-cyan-200">About</Link>
          <Link to="/" className="rounded-full border border-cyan-300/50 px-4 py-2 text-sm text-cyan-50 hover:border-cyan-200 hover:text-white">
            ← Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col items-center px-6 py-10 md:flex-row md:justify-between md:py-16">
        <div className="max-w-xl space-y-4">
          <p className="text-sm uppercase tracking-[0.2em] text-cyan-200">Secure Sign In</p>
          <h1 className="text-4xl font-semibold leading-tight text-white">Welcome back</h1>
          <p className="text-slate-200">
            Access your accounts with multi-factor authentication and enterprise-grade encryption.
          </p>
          <ul className="space-y-2 text-sm text-slate-300">
            <li>• FDIC insured up to $250,000 per depositor</li>
            <li>• Multi-factor authentication & biometrics</li>
            <li>• 256-bit SSL encryption</li>
            <li>• 24/7 fraud monitoring & zero liability</li>
          </ul>
        </div>

        <div className="mt-10 w-full max-w-md md:mt-0">
          <div className="login-card">
            <h2 className="text-xl font-semibold text-white">Sign in</h2>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-slate-200" htmlFor="login-email">Email</label>
                <input 
                  id="login-email" 
                  type="email" 
                  placeholder="you@example.com" 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="form-input" 
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-slate-200">
                  <label htmlFor="login-password">Password</label>
                  <button 
                    type="button" 
                    onClick={() => setShowForgotPassword(true)}
                    className="text-cyan-200 hover:text-cyan-100"
                  >
                    Forgot?
                  </button>
                </div>
                <input 
                  id="login-password" 
                  type="password" 
                  placeholder="••••••••" 
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="form-input" 
                  required
                />
              </div>
              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                  {error}
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-slate-200">
                <input id="remember" type="checkbox" className="h-4 w-4 rounded border-slate-600 bg-slate-800" />
                <label htmlFor="remember">Keep me signed in</label>
              </div>
              <button type="submit" className="w-full rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-400/30 transition hover:translate-y-0.5">
                Continue
              </button>
            </form>
            <p className="mt-6 text-center text-sm text-slate-300">
              New to Aurora?{' '}
              <Link to="/signup" className="font-semibold text-cyan-200 hover:text-cyan-100">Create account</Link>
            </p>
          </div>
        </div>
      </main>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
            <button
              onClick={() => {
                setShowForgotPassword(false);
                setForgotEmail('');
                setForgotMessage('');
                setForgotError('');
              }}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-200"
            >
              ✕
            </button>
            
            <h3 className="text-xl font-semibold text-white">Reset Password</h3>
            <p className="mt-2 text-sm text-slate-300">
              Enter your email address and we'll send you a link to reset your password.
            </p>

            <form onSubmit={handleForgotPassword} className="mt-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-slate-200" htmlFor="forgot-email">
                  Email Address
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  placeholder="you@example.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              {forgotError && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                  {forgotError}
                </div>
              )}

              {forgotMessage && (
                <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-400">
                  {forgotMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-400/30 transition hover:translate-y-0.5 disabled:opacity-50"
              >
                {isSubmitting ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default LoginPage;
