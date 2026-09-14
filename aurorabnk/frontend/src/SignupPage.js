import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuroraBankLogo from './components/AuroraBankLogo';
import { API_BASE } from './config';
import './App.css';

function SignupPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const updateField = (field) => (event) => setFormData((current) => ({ ...current, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone || undefined,
          dateOfBirth: formData.dateOfBirth || undefined,
          password: formData.password,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const validationMessage = data.errors?.[0]?.msg;
        throw new Error(validationMessage || data.message || 'Unable to create your account.');
      }
      navigate('/dashboard');
    } catch (signupError) {
      setError(signupError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-shell min-h-screen text-slate-50">
      <main className="auth-main flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
        <div className="login-card auth-login-card w-full max-w-2xl p-6 sm:p-8">
          <div className="mb-6 flex justify-center"><AuroraBankLogo /></div>
          <h1 className="text-center text-2xl font-bold text-white sm:text-3xl">Open your Aurora account</h1>
          <p className="mt-2 text-center text-sm text-slate-300">Create your secure banking profile in a few steps.</p>
          <form onSubmit={handleSubmit} className="mt-7 grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="text-sm text-slate-200" htmlFor="signup-first-name">First name</label><input id="signup-first-name" className="form-input mt-1" value={formData.firstName} onChange={updateField('firstName')} required /></div>
              <div><label className="text-sm text-slate-200" htmlFor="signup-last-name">Last name</label><input id="signup-last-name" className="form-input mt-1" value={formData.lastName} onChange={updateField('lastName')} required /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="text-sm text-slate-200" htmlFor="signup-email">Email</label><input id="signup-email" type="email" className="form-input mt-1" placeholder="you@example.com" value={formData.email} onChange={updateField('email')} required /></div>
              <div><label className="text-sm text-slate-200" htmlFor="signup-phone">Phone</label><input id="signup-phone" type="tel" className="form-input mt-1" placeholder="+1 555 555 5555" value={formData.phone} onChange={updateField('phone')} /></div>
            </div>
            <div><label className="text-sm text-slate-200" htmlFor="signup-dob">Date of birth</label><input id="signup-dob" type="date" className="form-input mt-1" value={formData.dateOfBirth} onChange={updateField('dateOfBirth')} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="text-sm text-slate-200" htmlFor="signup-password">Password</label><input id="signup-password" type="password" className="form-input mt-1" value={formData.password} onChange={updateField('password')} minLength="8" required /></div>
              <div><label className="text-sm text-slate-200" htmlFor="signup-confirm-password">Confirm password</label><input id="signup-confirm-password" type="password" className="form-input mt-1" value={formData.confirmPassword} onChange={updateField('confirmPassword')} minLength="8" required /></div>
            </div>
            {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300" role="alert">{error}</div>}
            <button type="submit" disabled={submitting} className="auth-submit-btn mt-2 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? 'Creating account...' : 'Create account'}</button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-300">Already have an account? <Link to="/login" className="font-semibold text-cyan-300 hover:text-cyan-200">Sign in</Link></p>
        </div>
      </main>
    </div>
  );
}

export default SignupPage;
