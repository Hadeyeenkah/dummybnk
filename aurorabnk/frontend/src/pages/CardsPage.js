import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBankContext } from '../context/BankContext';
import AuroraBankLogo from '../components/AuroraBankLogo';
import '../App.css';

function CardsPage() {
  const { currentUser } = useBankContext();
  const [cardLocked, setCardLocked] = useState(true);
  const [internationalEnabled, setInternationalEnabled] = useState(true);
  const [onlineEnabled, setOnlineEnabled] = useState(true);
  const [contactlessEnabled, setContactlessEnabled] = useState(true);
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [showTravelModal, setShowTravelModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [travelData, setTravelData] = useState({ destination: '', startDate: '', endDate: '' });
  const [notification, setNotification] = useState('');

  const handleLockToggle = () => {
    setCardLocked(!cardLocked);
    setNotification(cardLocked ? '✓ Card unlocked successfully' : '✓ Card locked successfully');
    setTimeout(() => setNotification(''), 3000);
  };

  const handleReplaceCard = () => {
    setShowReplaceModal(false);
    setNotification('✓ Card replacement request submitted. New card will arrive in 5-7 business days.');
    setTimeout(() => setNotification(''), 5000);
  };

  const handleTravelNotice = (e) => {
    e.preventDefault();
    setShowTravelModal(false);
    setNotification(`✓ Travel notice set for ${travelData.destination} from ${travelData.startDate} to ${travelData.endDate}`);
    setTimeout(() => setNotification(''), 5000);
    setTravelData({ destination: '', startDate: '', endDate: '' });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="border-b border-white/5 bg-slate-900/50 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3 text-cyan-400">
            <AuroraBankLogo />
            <span className="text-lg font-semibold tracking-tight text-slate-50">Aurora Bank</span>
          </div>
          <Link to="/dashboard" className="text-sm text-cyan-200 hover:text-white">
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="mb-2 text-3xl font-semibold text-white">Card Controls</h1>
        <p className="mb-8 text-slate-300">Manage your debit cards and security settings</p>

        {notification && (
          <div className="mb-6 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">
            {notification}
          </div>
        )}

        <div className="mb-8 grid gap-6 md:grid-cols-2">
          {/* Card Display */}
          <div className="card primary">
            <div className="mb-4 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              <div className="font-semibold text-amber-100">Card on temporary hold</div>
              <div className="text-amber-50/90">We spotted unusual activity from a new location. Your card is paused to prevent fraudulent swipes. You can unlock to resume spending, or contact support if you did not attempt these charges.</div>
            </div>
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.2em] text-cyan-100">Debit Card</span>
              <div className={`rounded-full px-3 py-1 text-xs ${cardLocked ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                {cardLocked ? '🔒 Locked' : '✓ Active'}
              </div>
            </div>
            <div className="mb-8">
              <div className="mb-4 text-sm text-cyan-100">•••• •••• •••• {currentUser?.accountNumber.slice(-4)}</div>
              <div className="flex justify-between text-sm">
                <div>
                  <div className="text-xs text-cyan-200">Card Holder</div>
                  <div className="text-white">{currentUser?.name}</div>
                </div>
                <div>
                  <div className="text-xs text-cyan-200">Expires</div>
                  <div className="text-white">12/27</div>
                </div>
              </div>
            </div>
            <button
              onClick={handleLockToggle}
              className={`w-full rounded-xl py-3 text-sm font-semibold transition ${cardLocked ? 'bg-green-500 text-white hover:bg-green-400' : 'bg-red-500 text-white hover:bg-red-400'}`}
            >
              {cardLocked ? 'Unlock Card' : 'Lock Card'}
            </button>
          </div>

          {/* Card Controls */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/5 bg-white/5 p-6">
              <h3 className="mb-4 text-lg font-semibold text-white">Security Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white">International Transactions</div>
                    <div className="text-xs text-slate-400">Allow purchases outside the US</div>
                  </div>
                  <button 
                    onClick={() => {
                      setInternationalEnabled(!internationalEnabled);
                      setNotification(internationalEnabled ? '✓ International transactions disabled' : '✓ International transactions enabled');
                      setTimeout(() => setNotification(''), 3000);
                    }}
                    className={`rounded-full px-4 py-1 text-xs font-semibold transition ${internationalEnabled ? 'bg-cyan-400 text-slate-900' : 'bg-slate-700 text-slate-300'}`}
                  >
                    {internationalEnabled ? 'On' : 'Off'}
                  </button>
                </div>
                <div className="flex items-center justify-between border-t border-white/5 pt-4">
                  <div>
                    <div className="text-sm font-semibold text-white">Online Purchases</div>
                    <div className="text-xs text-slate-400">E-commerce transactions</div>
                  </div>
                  <button 
                    onClick={() => {
                      setOnlineEnabled(!onlineEnabled);
                      setNotification(onlineEnabled ? '✓ Online purchases disabled' : '✓ Online purchases enabled');
                      setTimeout(() => setNotification(''), 3000);
                    }}
                    className={`rounded-full px-4 py-1 text-xs font-semibold transition ${onlineEnabled ? 'bg-cyan-400 text-slate-900' : 'bg-slate-700 text-slate-300'}`}
                  >
                    {onlineEnabled ? 'On' : 'Off'}
                  </button>
                </div>
                <div className="flex items-center justify-between border-t border-white/5 pt-4">
                  <div>
                    <div className="text-sm font-semibold text-white">Contactless Payments</div>
                    <div className="text-xs text-slate-400">Tap to pay with your card</div>
                  </div>
                  <button 
                    onClick={() => {
                      setContactlessEnabled(!contactlessEnabled);
                      setNotification(contactlessEnabled ? '✓ Contactless payments disabled' : '✓ Contactless payments enabled');
                      setTimeout(() => setNotification(''), 3000);
                    }}
                    className={`rounded-full px-4 py-1 text-xs font-semibold transition ${contactlessEnabled ? 'bg-cyan-400 text-slate-900' : 'bg-slate-700 text-slate-300'}`}
                  >
                    {contactlessEnabled ? 'On' : 'Off'}
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/5 p-6">
              <h3 className="mb-4 text-lg font-semibold text-white">Spending Limits</h3>
              <div className="space-y-3">
                <div>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="text-slate-300">Daily ATM Limit</span>
                    <span className="text-white">$500 / $1,000</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10">
                    <div className="h-full w-1/2 rounded-full bg-cyan-400" />
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="text-slate-300">Daily Purchase Limit</span>
                    <span className="text-white">$1,200 / $5,000</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10">
                    <div className="h-full w-1/4 rounded-full bg-cyan-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <button 
            onClick={() => setShowReplaceModal(true)}
            className="rounded-xl border border-white/5 bg-white/5 p-4 text-left transition hover:bg-white/10"
          >
            <div className="mb-2 text-2xl">🔄</div>
            <div className="text-sm font-semibold text-white">Replace Card</div>
            <div className="text-xs text-slate-400">Lost or damaged card</div>
          </button>
          <button 
            onClick={() => setShowTravelModal(true)}
            className="rounded-xl border border-white/5 bg-white/5 p-4 text-left transition hover:bg-white/10"
          >
            <div className="mb-2 text-2xl">📍</div>
            <div className="text-sm font-semibold text-white">Set Travel Notice</div>
            <div className="text-xs text-slate-400">Avoid declined transactions</div>
          </button>
          <button 
            onClick={() => setShowPinModal(true)}
            className="rounded-xl border border-white/5 bg-white/5 p-4 text-left transition hover:bg-white/10"
          >
            <div className="mb-2 text-2xl">💳</div>
            <div className="text-sm font-semibold text-white">View PIN</div>
            <div className="text-xs text-slate-400">Reveal your card PIN</div>
          </button>
        </div>
      </main>

      {/* Replace Card Modal */}
      {showReplaceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <h2 className="mb-4 text-xl font-semibold text-white">Replace Card</h2>
            <p className="mb-6 text-sm text-slate-300">
              Your new card will be sent to your registered address and will arrive in 5-7 business days. Your current card will be deactivated once you activate the new one.
            </p>
            <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs text-slate-400 mb-2">Delivery Address</div>
              <div className="text-sm text-white">{currentUser?.name}</div>
              <div className="text-sm text-slate-300">123 Main Street</div>
              <div className="text-sm text-slate-300">New York, NY 10001</div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleReplaceCard}
                className="flex-1 rounded-xl bg-cyan-400 py-3 text-sm font-semibold text-slate-900 transition hover:bg-cyan-300"
              >
                Confirm Replacement
              </button>
              <button
                onClick={() => setShowReplaceModal(false)}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Travel Notice Modal */}
      {showTravelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <h2 className="mb-4 text-xl font-semibold text-white">Set Travel Notice</h2>
            <p className="mb-6 text-sm text-slate-300">
              Let us know when you're traveling to avoid declined transactions
            </p>
            <form onSubmit={handleTravelNotice} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-slate-200">Destination</label>
                <input
                  type="text"
                  value={travelData.destination}
                  onChange={(e) => setTravelData({ ...travelData, destination: e.target.value })}
                  placeholder="e.g., Paris, France"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-400 outline-none focus:border-cyan-300/50"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm text-slate-200">Start Date</label>
                  <input
                    type="date"
                    value={travelData.startDate}
                    onChange={(e) => setTravelData({ ...travelData, startDate: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-300/50"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-slate-200">End Date</label>
                  <input
                    type="date"
                    value={travelData.endDate}
                    onChange={(e) => setTravelData({ ...travelData, endDate: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-300/50"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-cyan-400 py-3 text-sm font-semibold text-slate-900 transition hover:bg-cyan-300"
                >
                  Set Notice
                </button>
                <button
                  type="button"
                  onClick={() => setShowTravelModal(false)}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <h2 className="mb-4 text-xl font-semibold text-white">Card PIN</h2>
            <p className="mb-6 text-sm text-slate-300">
              Keep your PIN secure and never share it with anyone
            </p>
            <div className="mb-6 rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-6 text-center">
              <div className="mb-2 text-xs uppercase tracking-wider text-cyan-300">Your PIN</div>
              <div className="text-4xl font-bold tracking-[0.5em] text-white">1234</div>
            </div>
            <div className="mb-6 rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-4">
              <div className="flex gap-3">
                <span className="text-yellow-400">⚠️</span>
                <p className="text-xs text-yellow-200">
                  Never share your PIN. Cover the keypad when entering your PIN at ATMs and stores.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowPinModal(false)}
              className="w-full rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CardsPage;
