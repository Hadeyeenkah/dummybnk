import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuroraBankLogo from '../components/AuroraBankLogo';

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token');
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      const apiBase = process.env.REACT_APP_API_BASE || 'http://localhost:5001/api';
      const res = await fetch(`${apiBase}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          newPassword: formData.newPassword
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(data.message || 'Password reset successful!');
        setFormData({ newPassword: '', confirmPassword: '' });
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(data.message || 'Failed to reset password');
      }
    } catch (err) {
      setError('Network error. Please try again.');
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
        <Link to="/login" className="rounded-full border border-cyan-300/50 px-4 py-2 text-sm text-cyan-50 hover:border-cyan-200 hover:text-white">
          ← Back to login
        </Link>
      </header>

      <main className="mx-auto flex max-w-md flex-col items-center px-6 py-16">
        <div className="w-full">
          <div className="login-card">
            <h2 className="text-xl font-semibold text-white">Reset Your Password</h2>
            <p className="mt-2 text-sm text-slate-300">
              Enter your new password below
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-slate-200" htmlFor="new-password">
                  New Password
                </label>
                <input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.newPassword}
                  onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                  className="form-input"
                  required
                  minLength={8}
                />
                <p className="text-xs text-slate-400">At least 8 characters</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-200" htmlFor="confirm-password">
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  className="form-input"
                  required
                  minLength={8}
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-400">
                  {success}
                  <br />
                  <span className="text-xs">Redirecting to login...</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !token}
                className="w-full rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-400/30 transition hover:translate-y-0.5 disabled:opacity-50"
              >
                {isSubmitting ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-300">
              Remember your password?{' '}
              <Link to="/login" className="font-semibold text-cyan-200 hover:text-cyan-100">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ResetPasswordPage;
