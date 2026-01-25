import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useBankContext } from './context/BankContext';
import AuroraBankLogo from './components/AuroraBankLogo';
import './App.css';


function SignupPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-center justify-center">
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
      <main className="flex flex-col items-center justify-center flex-1">
        <div className="max-w-lg w-full bg-slate-900 rounded-xl p-8 shadow-lg border border-cyan-900/30">
          <h2 className="text-2xl font-bold text-center text-cyan-400 mb-4">Sign Up Disabled</h2>
          <p className="text-center text-slate-200 mb-2">Account creation is restricted. Only an admin can set up user accounts.</p>
          <p className="text-center text-slate-400">Please contact your bank administrator to receive your login credentials.</p>
          <div className="mt-6 text-center">
            <Link to="/login" className="font-semibold text-cyan-200 hover:text-cyan-100">Go to Login</Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default SignupPage;
