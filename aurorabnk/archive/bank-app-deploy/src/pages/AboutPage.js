import React from 'react';
import { Link } from 'react-router-dom';
import AuroraBankLogo from '../components/AuroraBankLogo';
import './Page.css';

function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="absolute inset-0 -z-10 gradient-veil" />

      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-3 text-cyan-400">
          <AuroraBankLogo />
          <span className="text-lg font-semibold tracking-tight text-slate-50">Aurora Bank, FSB</span>
        </Link>
        <div className="flex gap-4">
          <Link to="/login" className="rounded-full border border-cyan-300/50 px-4 py-2 text-sm text-cyan-50 hover:border-cyan-200 hover:text-white">
            Sign In
          </Link>
          <Link to="/signup" className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg hover:bg-cyan-300">
            Open Account
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="space-y-8">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-200">About Aurora Bank</p>
            <h1 className="mt-2 text-4xl font-semibold leading-tight text-white">
              Over a Century of Trust & Service
            </h1>
          </div>

          <div className="space-y-6 text-slate-300">
            <p className="text-lg leading-relaxed">
              Aurora Bank, FSB is a federally chartered savings bank headquartered in Wilmington, Delaware, 
              with a rich history dating back to <strong className="text-white">1921</strong>. Originally established as 
              Delaware Savings And Loan Association, we have served American families and businesses for over a century.
            </p>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8">
              <h2 className="mb-4 text-2xl font-semibold text-white">Our History</h2>
              <div className="space-y-6">
                <div className="border-l-2 border-cyan-400 pl-6">
                  <p className="text-sm font-semibold text-cyan-300">1921</p>
                  <p className="mt-1 text-slate-200">
                    Founded as Delaware Savings And Loan Association in Wilmington, Delaware, 
                    providing savings and mortgage services to local communities.
                  </p>
                </div>

                <div className="border-l-2 border-cyan-400 pl-6">
                  <p className="text-sm font-semibold text-cyan-300">1988</p>
                  <p className="mt-1 text-slate-200">
                    Reorganized as a Federal Savings Bank (FSB), expanding our capabilities and 
                    regulatory framework to better serve depositors nationwide.
                  </p>
                </div>

                <div className="border-l-2 border-cyan-400 pl-6">
                  <p className="text-sm font-semibold text-cyan-300">1999-2008</p>
                  <p className="mt-1 text-slate-200">
                    Operated as a subsidiary of Lehman Brothers, renamed Lehman Brothers Bank, 
                    leading mortgage lending operations while maintaining retail banking services.
                  </p>
                </div>

                <div className="border-l-2 border-cyan-400 pl-6">
                  <p className="text-sm font-semibold text-cyan-300">2012</p>
                  <p className="mt-1 text-slate-200">
                    Rebranded as Aurora Bank, FSB. Strategic restructuring and sale of certain assets 
                    to New York Community Bank ensured continuity of service for all depositors.
                  </p>
                </div>

                <div className="border-l-2 border-cyan-400 pl-6">
                  <p className="text-sm font-semibold text-cyan-300">2013-Present</p>
                  <p className="mt-1 text-slate-200">
                    Relocated headquarters to Littleton, Colorado. Today, Aurora Bank continues to offer 
                    modern digital banking solutions with the stability and trust of over a century of service.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                <h3 className="mb-3 text-xl font-semibold text-white">FDIC Insured</h3>
                <p className="text-sm text-slate-300">
                  All deposit accounts are insured up to $250,000 per depositor by the 
                  Federal Deposit Insurance Corporation (FDIC). Member FDIC.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                <h3 className="mb-3 text-xl font-semibold text-white">Equal Housing Lender</h3>
                <p className="text-sm text-slate-300">
                  Aurora Bank is an Equal Housing Lender and committed to fair lending practices. 
                  We do not discriminate on the basis of race, color, religion, national origin, 
                  sex, handicap, or familial status.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8">
              <h2 className="mb-4 text-2xl font-semibold text-white">Our Mission Today</h2>
              <p className="leading-relaxed text-slate-300">
                At Aurora Bank, we combine the reliability and trust of a century-old institution 
                with cutting-edge digital banking technology. Our mission is to provide secure, 
                accessible, and innovative financial services to individuals and businesses across 
                the United States. We are committed to financial inclusion, exceptional customer 
                service, and safeguarding your financial future.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8">
              <h2 className="mb-4 text-2xl font-semibold text-white">Contact Us</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-semibold text-cyan-300">Headquarters</p>
                  <p className="mt-1 text-sm text-slate-300">
                    Aurora Bank, FSB<br />
                    2455 W. Main Street<br />
                    Littleton, CO 80120
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-cyan-300">Customer Service</p>
                  <p className="mt-1 text-sm text-slate-300">
                    Phone: 1-800-AURORA-1 (1-800-287-6721)<br />
                    Email: support@aurorabank.com<br />
                    Hours: Mon-Fri 8am-8pm ET, Sat 9am-5pm ET
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-slate-800 bg-slate-900/30 px-6 py-8">
        <div className="mx-auto max-w-5xl space-y-4 text-center text-xs text-slate-400">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <span>Member FDIC</span>
            <span>•</span>
            <span>Equal Housing Lender</span>
            <span>•</span>
            <span>Routing Number: 031318766</span>
          </div>
          <p>
            © 2025 Aurora Bank, FSB. All rights reserved. FDIC Certificate #35519.
          </p>
          <p className="text-[10px]">
            Banking products and services are provided by Aurora Bank, FSB, a federally chartered savings bank. 
            Deposits are FDIC insured up to $250,000 per depositor.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default AboutPage;
