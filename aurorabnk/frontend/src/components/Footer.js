import React from 'react';
import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-800 bg-slate-900/30 px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <h3 className="mb-3 text-sm font-semibold text-white">Banking</h3>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><Link to="/dashboard" className="hover:text-cyan-300">Personal Banking</Link></li>
              <li><Link to="/dashboard" className="hover:text-cyan-300">Business Banking</Link></li>
              <li><Link to="/cards" className="hover:text-cyan-300">Credit Cards</Link></li>
              <li><Link to="/transfer" className="hover:text-cyan-300">Loans & Mortgages</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-white">Support</h3>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><Link to="/about" className="hover:text-cyan-300">About Us</Link></li>
              <li><a href="tel:18002876721" className="hover:text-cyan-300">1-800-AURORA-1</a></li>
              <li><a href="mailto:support@aurorabank.com" className="hover:text-cyan-300">Contact Support</a></li>
              <li><Link to="/security" className="hover:text-cyan-300">Security Center</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-white">Legal</h3>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><Link to="/privacy" className="hover:text-cyan-300">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-cyan-300">Terms of Service</Link></li>
              <li><Link to="/security" className="hover:text-cyan-300">Online Security Guarantee</Link></li>
              <li><Link to="/accessibility" className="hover:text-cyan-300">Accessibility</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-white">Aurora Bank, FSB</h3>
            <p className="text-xs text-slate-400">
              2455 W. Main Street<br />
              Littleton, CO 80120<br />
              <br />
              Routing: 031318766<br />
              FDIC Cert: #35519
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-3 border-t border-slate-800 pt-6 text-center text-xs text-slate-500">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="font-semibold">Member FDIC</span>
            <span>•</span>
            <span>Equal Housing Lender</span>
            <span>•</span>
            <span>Est. 1921</span>
          </div>
          <p>
            © 2025 Aurora Bank, FSB. All rights reserved.
          </p>
          <p className="text-[10px] leading-relaxed">
            Banking products and services are provided by Aurora Bank, FSB, a federally chartered savings bank 
            headquartered in Littleton, Colorado. Deposits are FDIC insured up to $250,000 per depositor, per 
            insured bank, for each account ownership category. Investment and insurance products are not FDIC 
            insured, not bank guaranteed, and may lose value.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
