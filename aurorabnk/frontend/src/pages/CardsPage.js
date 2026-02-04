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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-xl shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <AuroraBankLogo />
            <span className="text-lg font-semibold tracking-tight bg-gradient-to-r from-indigo-900 to-slate-950 bg-clip-text text-transparent">Aurora Bank</span>
          </div>
          <Link to="/dashboard" className="text-sm text-indigo-800 hover:text-indigo-950">
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="mb-2 text-3xl font-semibold text-slate-900">Card Controls</h1>
        <p className="mb-8 text-slate-600">Manage your debit cards and security settings</p>

        {notification && (
          <div className="mb-6 rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">
            {notification}
          </div>
        )}

        <div className="mb-8 grid gap-6 md:grid-cols-2">
          {/* Card Display */}
          <div className="card primary rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <div className="font-semibold text-amber-950">Card on temporary hold</div>
              <div className="text-amber-800">We spotted unusual activity from a new location. Your card is paused to prevent fraudulent swipes. You can unlock to resume spending, or contact support if you did not attempt these charges.</div>
            </div>
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.2em] text-indigo-700 font-semibold">Debit Card</span>
              <div className={`rounded-full px-3 py-1 text-xs ${cardLocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                {cardLocked ? '🔒 Locked' : '✓ Active'}
              </div>
            </div>
            <div className="mb-8">
              <div className="mb-4 text-sm text-indigo-700 font-semibold">•••• •••• •••• {currentUser?.accountNumber.slice(-4)}</div>
              <div className="flex justify-between text-sm">
                <div>
                  <div className="text-xs text-slate-600">Card Holder</div>
                  <div className="text-slate-900 font-semibold">{currentUser?.name}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-600">Expires</div>
                  <div className="text-slate-900 font-semibold">12/27</div>
                </div>
              </div>
            </div>
            <button
              onClick={handleLockToggle}
              className={`w-full rounded-xl py-3 text-sm font-semibold transition ${cardLocked ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-red-500 text-white hover:bg-red-600'}`}
            >
              {cardLocked ? 'Unlock Card' : 'Lock Card'}
            </button>
          </div>

          {/* Card Controls */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
              <h3 className="mb-4 text-lg font-semibold text-slate-900">Security Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">International Transactions</div>
                    <div className="text-xs text-slate-600">Allow purchases outside the US</div>
                  </div>
                  <button 
                    onClick={() => {
                      setInternationalEnabled(!internationalEnabled);
                      setNotification(internationalEnabled ? '✓ International transactions disabled' : '✓ International transactions enabled');
                      setTimeout(() => setNotification(''), 3000);
                    }}
                    className={`rounded-full px-4 py-1 text-xs font-semibold transition ${internationalEnabled ? 'bg-indigo-900 text-white' : 'bg-slate-200 text-slate-700'}`}
                  >
                    {internationalEnabled ? 'On' : 'Off'}
                  </button>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Online Purchases</div>
                    <div className="text-xs text-slate-600">E-commerce transactions</div>
                  </div>
                  <button 
                    onClick={() => {
                      setOnlineEnabled(!onlineEnabled);
                      setNotification(onlineEnabled ? '✓ Online purchases disabled' : '✓ Online purchases enabled');
                      setTimeout(() => setNotification(''), 3000);
                    }}
                    className={`rounded-full px-4 py-1 text-xs font-semibold transition ${onlineEnabled ? 'bg-indigo-900 text-white' : 'bg-slate-200 text-slate-700'}`}
                  >
                    {onlineEnabled ? 'On' : 'Off'}
                  </button>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Contactless Payments</div>
                    <div className="text-xs text-slate-600">Tap to pay with your card</div>
                  </div>
                  <button 
                    onClick={() => {
                      setContactlessEnabled(!contactlessEnabled);
                      setNotification(contactlessEnabled ? '✓ Contactless payments disabled' : '✓ Contactless payments enabled');
                      setTimeout(() => setNotification(''), 3000);
                    }}
                    className={`rounded-full px-4 py-1 text-xs font-semibold transition ${contactlessEnabled ? 'bg-indigo-900 text-white' : 'bg-slate-200 text-slate-700'}`}
                  >
                    {contactlessEnabled ? 'On' : 'Off'}
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
              <h3 className="mb-4 text-lg font-semibold text-slate-900">Spending Limits</h3>
              <div className="space-y-3">
                <div>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="text-slate-600">Daily ATM Limit</span>
                    <span className="text-slate-900 font-semibold">$500 / $1,000</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200">
                    <div className="h-full w-1/2 rounded-full bg-indigo-900" />
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="text-slate-600">Daily Purchase Limit</span>
                    <span className="text-slate-900 font-semibold">$1,200 / $5,000</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200">
                    <div className="h-full w-1/4 rounded-full bg-indigo-900" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <button 
            onClick={() => setShowReplaceModal(true)}
            className="rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:bg-slate-50 shadow-sm"
          >
            <div className="mb-2 text-2xl">🔄</div>
            <div className="text-sm font-semibold text-slate-900">Replace Card</div>
            <div className="text-xs text-slate-600">Lost or damaged card</div>
          </button>
          <button 
            onClick={() => setShowTravelModal(true)}
            className="rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:bg-slate-50 shadow-sm"
          >
            <div className="mb-2 text-2xl">📍</div>
            <div className="text-sm font-semibold text-slate-900">Set Travel Notice</div>
            <div className="text-xs text-slate-600">Avoid declined transactions</div>
          </button>
          <button 
            onClick={() => setShowPinModal(true)}
            className="rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:bg-slate-50 shadow-sm"
          >
            <div className="mb-2 text-2xl">💳</div>
            <div className="text-sm font-semibold text-slate-900">View PIN</div>
            <div className="text-xs text-slate-600">Reveal your card PIN</div>
          </button>
        </div>
      </main>

      {/* Replace Card Modal */}
      {showReplaceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-xl font-semibold text-slate-900">Replace Card</h2>
            <p className="mb-6 text-sm text-slate-600">
              Your new card will be sent to your registered address and will arrive in 5-7 business days. Your current card will be deactivated once you activate the new one.
            </p>
            <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs text-slate-600 mb-2">Delivery Address</div>
              <div className="text-sm text-slate-900 font-semibold">{currentUser?.name}</div>
              <div className="text-sm text-slate-700">123 Main Street</div>
              <div className="text-sm text-slate-700">New York, NY 10001</div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleReplaceCard}
                className="flex-1 rounded-xl bg-gradient-to-r from-indigo-900 to-slate-950 py-3 text-sm font-semibold text-white transition hover:from-indigo-950 hover:to-black"
              >
                Confirm Replacement
              </button>
              <button
                onClick={() => setShowReplaceModal(false)}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Travel Notice Modal */}
      {showTravelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-xl font-semibold text-slate-900">Set Travel Notice</h2>
            <p className="mb-6 text-sm text-slate-600">
              Let us know when you're traveling to avoid declined transactions
            </p>
            <form onSubmit={handleTravelNotice} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-slate-700 font-semibold">Destination</label>
                <input
                  type="text"
                  value={travelData.destination}
                  onChange={(e) => setTravelData({ ...travelData, destination: e.target.value })}
                  placeholder="e.g., Paris, France"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-800 focus:ring-2 focus:ring-indigo-900/20"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm text-slate-700 font-semibold">Start Date</label>
                  <input
                    type="date"
                    value={travelData.startDate}
                    onChange={(e) => setTravelData({ ...travelData, startDate: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-indigo-800 focus:ring-2 focus:ring-indigo-900/20"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-slate-700 font-semibold">End Date</label>
                  <input
                    type="date"
                    value={travelData.endDate}
                    onChange={(e) => setTravelData({ ...travelData, endDate: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-indigo-800 focus:ring-2 focus:ring-indigo-900/20"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-gradient-to-r from-indigo-900 to-slate-950 py-3 text-sm font-semibold text-white transition hover:from-indigo-950 hover:to-black"
                >
                  Set Notice
                </button>
                <button
                  type="button"
                  onClick={() => setShowTravelModal(false)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-xl font-semibold text-slate-900">Card PIN</h2>
            <p className="mb-6 text-sm text-slate-600">
              Keep your PIN secure and never share it with anyone
            </p>
            <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50 p-6 text-center">
              <div className="mb-2 text-xs uppercase tracking-wider text-indigo-700 font-semibold">Your PIN</div>
              <div className="text-4xl font-bold tracking-[0.5em] text-indigo-900">1234</div>
            </div>
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex gap-3">
                <span className="text-amber-600">⚠️</span>
                <p className="text-xs text-amber-900">
                  Never share your PIN. Cover the keypad when entering your PIN at ATMs and stores.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowPinModal(false)}
              className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
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
