import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useBankContext } from './context/BankContext';
import AuroraBankLogo from './components/AuroraBankLogo';
import './App.css';

function SignupPage() {
  const navigate = useNavigate();
  const { signup } = useBankContext();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    
    const result = await signup(formData);
    if (result.success) {
      const linkText = result.verificationLink ? ` Click this verification link: ${result.verificationLink}` : '';
      setSuccess((result.message || 'Account created! Check your email to verify your account.') + linkText);
      navigate('/dashboard');
    } else {
      setError(result.message || 'Sign up failed. Try a different email.');
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
          <p className="text-sm uppercase tracking-[0.2em] text-cyan-200">Create Account</p>
          <h1 className="text-4xl font-semibold leading-tight text-white">Join Aurora Bank</h1>
          <p className="text-slate-200">
            Open your account in minutes with enterprise-grade security and instant access to modern banking.
          </p>
          <ul className="space-y-2 text-sm text-slate-300">
            <li>• FDIC insured up to $250,000 per depositor</li>
            <li>• No monthly fees or minimum balance</li>
            <li>• Free ACH transfers & bill pay</li>
            <li>• Up to 4.15% APY on savings accounts</li>
          </ul>
        </div>

        <div className="mt-10 w-full max-w-md md:mt-0">
          <div className="login-card">
            <h2 className="text-xl font-semibold text-white">Create your account</h2>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-slate-200" htmlFor="signup-name">Full name</label>
                <input 
                  id="signup-name" 
                  type="text" 
                  placeholder="Jamie Doe" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="form-input" 
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-200" htmlFor="signup-email">Email</label>
                <input 
                  id="signup-email" 
                  type="email" 
                  placeholder="you@example.com" 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="form-input" 
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-200" htmlFor="signup-phone">Phone number</label>
                <input 
                  id="signup-phone" 
                  type="tel" 
                  placeholder="+1 (555) 000-0000" 
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="form-input" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-200" htmlFor="signup-password">Password</label>
                <input 
                  id="signup-password" 
                  type="password" 
                  placeholder="Create a strong password" 
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="form-input" 
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-200" htmlFor="signup-confirm">Confirm password</label>
                <input 
                  id="signup-confirm" 
                  type="password" 
                  placeholder="Re-enter password" 
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  className="form-input" 
                  required
                />
              </div>
              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-400 break-words">
                  ✅ {success}
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-slate-200">
                <input id="terms" type="checkbox" className="h-4 w-4 rounded border-slate-600 bg-slate-800" />
                <label htmlFor="terms">I agree to the Terms of Service and Privacy Policy</label>
              </div>
              <button type="submit" className="w-full rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-400/30 transition hover:translate-y-0.5">
                Create account
              </button>
            </form>
            <p className="mt-6 text-center text-sm text-slate-300">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-cyan-200 hover:text-cyan-100">Sign in</Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default SignupPage;
