import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBankContext } from '../context/BankContext';
import './Page.css';

function SecurityPage() {
  const { currentUser } = useBankContext();
  // Use full backend URL on production to prevent routing to frontend
  const getApiBase = () => {
    if (process.env.NODE_ENV === 'production') {
      const baseUrl = process.env.REACT_APP_API_URL || '';
      return baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
    }
    const baseUrl = process.env.REACT_APP_API_BASE || 'http://localhost:5001';
    return baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
  };
  const apiBase = getApiBase();
  
  // State management
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDevicesModal, setShowDevicesModal] = useState(false);
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  
  // 2FA state
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [mfaStep, setMfaStep] = useState('init'); // init, setup, verify
  const [mfaError, setMfaError] = useState('');
  const [mfaSuccess, setMfaSuccess] = useState('');
  
  // Password state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  
  // Alerts state
  const [alerts, setAlerts] = useState({
    loginEmail: true,
    loginSMS: false,
    largeTransaction: true,
    newDevice: true
  });
  
  // Devices state
  const [devices, setDevices] = useState([
    { id: 1, name: 'Chrome on Linux', location: 'Delaware, US', lastActive: 'Active now', current: true },
    { id: 2, name: 'Safari on iPhone', location: 'Colorado, US', lastActive: '2 hours ago', current: false },
    { id: 3, name: 'Firefox on Windows', location: 'New York, US', lastActive: '3 days ago', current: false },
  ]);
  
  // Session history
  const sessions = [
    { id: 1, timestamp: '2025-12-29 10:30 AM', action: 'Login', device: 'Chrome on Linux', ip: '192.168.1.100', status: 'success' },
    { id: 2, timestamp: '2025-12-28 03:15 PM', action: 'Password change', device: 'Chrome on Linux', ip: '192.168.1.100', status: 'success' },
    { id: 3, timestamp: '2025-12-27 09:45 AM', action: 'Login', device: 'Safari on iPhone', ip: '10.0.0.50', status: 'success' },
    { id: 4, timestamp: '2025-12-26 11:20 PM', action: 'Failed login attempt', device: 'Unknown', ip: '185.220.101.45', status: 'failed' },
  ];

  // Enable 2FA
  const handleEnable2FA = async () => {
    try {
      setMfaError('');
      const res = await fetch(`${apiBase}/auth/enable-2fa`, {
        method: 'POST',
        credentials: 'include',
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        setMfaError(errorData.message || 'Failed to enable 2FA');
        return;
      }
      
      const data = await res.json();
      setQrCode(data.qrDataUrl);
      setMfaSecret(data.base32);
      setMfaStep('setup');
    } catch (err) {
      setMfaError('Network error. Please try again.');
    }
  };

  // Confirm 2FA setup
  const handleConfirm2FA = async (e) => {
    e.preventDefault();
    setMfaError('');
    
    if (!mfaToken || mfaToken.length !== 6) {
      setMfaError('Please enter a valid 6-digit code');
      return;
    }
    
    try {
      const res = await fetch(`${apiBase}/auth/confirm-2fa`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: mfaToken }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        setMfaError(errorData.message || 'Invalid code. Please try again.');
        return;
      }
      
      setMfaEnabled(true);
      setMfaSuccess('Two-factor authentication enabled successfully!');
      setMfaStep('verify');
      setTimeout(() => {
        setShow2FAModal(false);
        setMfaSuccess('');
        setMfaStep('init');
        setMfaToken('');
      }, 2000);
    } catch (err) {
      setMfaError('Network error. Please try again.');
    }
  };

  // Disable 2FA
  const handleDisable2FA = () => {
    setMfaEnabled(false);
    setMfaSuccess('Two-factor authentication has been disabled');
    setTimeout(() => setMfaSuccess(''), 3000);
  };

  // Change password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }
    
    if (passwordData.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    
    try {
      const res = await fetch(`${apiBase}/auth/change-password`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        setPasswordError(errorData.message || 'Failed to change password');
        return;
      }
      
      setPasswordSuccess('Password changed successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess('');
      }, 2000);
    } catch (err) {
      setPasswordError('Network error. Please try again.');
    }
  };

  // Remove device
  const handleRemoveDevice = (deviceId) => {
    if (devices.find(d => d.id === deviceId)?.current) {
      alert('Cannot remove current device');
      return;
    }
    setDevices(devices.filter(d => d.id !== deviceId));
  };

  // Save alerts
  const handleSaveAlerts = () => {
    setShowAlertsModal(false);
    // In a real app, this would save to backend
    alert('Alert preferences saved successfully!');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="absolute inset-0 -z-10 gradient-veil" />
      
      <div className="mx-auto max-w-5xl px-6 py-10 space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-200">Security Center</p>
            <h1 className="text-3xl font-semibold text-white">Protect your account</h1>
            <p className="text-slate-300 mt-2">Manage authentication, alerts, and trusted devices.</p>
            {currentUser?.email && (
              <p className="text-sm text-slate-400 mt-1">Signed in as {currentUser.email}</p>
            )}
          </div>
          <Link to="/dashboard" className="text-cyan-300 hover:text-cyan-100 text-sm">← Back to dashboard</Link>
        </header>

        {/* Success Messages */}
        {mfaSuccess && (
          <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-400">
            ✓ {mfaSuccess}
          </div>
        )}

        {/* Security Options Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Two-Factor Authentication</h2>
                <p className="text-sm text-slate-300 mt-2">Add an extra layer of protection with OTP or authenticator apps.</p>
              </div>
              {mfaEnabled && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">Enabled</span>}
            </div>
            <button 
              onClick={() => setShow2FAModal(true)}
              className="mt-4 rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-cyan-300 transition"
            >
              Manage 2FA
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Login Alerts</h2>
                <p className="text-sm text-slate-300 mt-2">Receive notifications for new device logins and suspicious activity.</p>
              </div>
              <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded-full">Active</span>
            </div>
            <button 
              onClick={() => setShowAlertsModal(true)}
              className="mt-4 rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-white hover:border-cyan-300 transition"
            >
              Configure alerts
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold text-white">Trusted Devices</h2>
            <p className="text-sm text-slate-300 mt-2">Review and remove devices that have access to your account.</p>
            <p className="text-xs text-slate-400 mt-1">{devices.length} device(s) connected</p>
            <button 
              onClick={() => setShowDevicesModal(true)}
              className="mt-4 rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-white hover:border-cyan-300 transition"
            >
              View devices
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold text-white">Password</h2>
            <p className="text-sm text-slate-300 mt-2">Update your password regularly to keep your account secure.</p>
            <p className="text-xs text-slate-400 mt-1">Last changed: 2 days ago</p>
            <button 
              onClick={() => setShowPasswordModal(true)}
              className="mt-4 rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-white hover:border-cyan-300 transition"
            >
              Change password
            </button>
          </div>
        </div>

        {/* Session History */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Recent Security Activity</h2>
          <div className="space-y-3">
            {sessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${session.status === 'failed' ? 'text-red-400' : 'text-white'}`}>
                      {session.action}
                    </span>
                    {session.status === 'failed' && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">Failed</span>}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {session.device} • {session.ip}
                  </div>
                </div>
                <div className="text-xs text-slate-500">{session.timestamp}</div>
              </div>
            ))}
          </div>
        </div>

        {/* FDIC Security Notice */}
        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-6">
          <div className="flex items-start gap-4">
            <span className="text-2xl">🛡️</span>
            <div>
              <h3 className="text-lg font-semibold text-white">Your Security is Our Priority</h3>
              <p className="text-sm text-slate-300 mt-2">
                Aurora Bank, FSB uses bank-level 256-bit SSL encryption to protect your data. We monitor your account 24/7 
                for suspicious activity and provide zero-liability fraud protection. Your deposits are FDIC insured up to $250,000.
              </p>
              <div className="flex gap-3 mt-4 text-xs text-slate-400">
                <span>• 256-bit SSL Encryption</span>
                <span>• Zero Liability Protection</span>
                <span>• 24/7 Fraud Monitoring</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2FA Modal */}
      {show2FAModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Two-Factor Authentication</h2>
              <button onClick={() => setShow2FAModal(false)} className="text-slate-400 hover:text-white text-2xl">×</button>
            </div>

            {mfaStep === 'init' && !mfaEnabled && (
              <div className="space-y-4">
                <p className="text-sm text-slate-300">
                  Protect your account with an additional layer of security. You'll need your phone to sign in.
                </p>
                <button 
                  onClick={handleEnable2FA}
                  className="w-full rounded-lg bg-cyan-400 px-4 py-3 font-semibold text-slate-900 hover:bg-cyan-300 transition"
                >
                  Enable 2FA
                </button>
              </div>
            )}

            {mfaStep === 'init' && mfaEnabled && (
              <div className="space-y-4">
                <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4">
                  <p className="text-sm text-green-400">✓ Two-factor authentication is enabled</p>
                </div>
                <button 
                  onClick={handleDisable2FA}
                  className="w-full rounded-lg border border-red-500/50 px-4 py-3 font-semibold text-red-400 hover:bg-red-500/10 transition"
                >
                  Disable 2FA
                </button>
              </div>
            )}

            {mfaStep === 'setup' && (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-sm text-slate-300 mb-4">Scan this QR code with your authenticator app:</p>
                  {qrCode && <img src={qrCode} alt="QR Code" className="mx-auto rounded-lg border border-white/10" />}
                  <div className="mt-4 rounded-lg bg-white/5 p-3">
                    <p className="text-xs text-slate-400 mb-1">Manual entry code:</p>
                    <code className="text-sm text-cyan-300 font-mono break-all">{mfaSecret}</code>
                  </div>
                </div>
                <form onSubmit={handleConfirm2FA} className="space-y-4">
                  <div>
                    <label className="text-sm text-slate-300 block mb-2">Enter 6-digit code</label>
                    <input
                      type="text"
                      maxLength="6"
                      value={mfaToken}
                      onChange={(e) => setMfaToken(e.target.value.replace(/\D/g, ''))}
                      className="w-full rounded-lg border border-white/10 bg-slate-800 px-4 py-3 text-white text-center text-lg tracking-widest outline-none focus:border-cyan-400 transition"
                      placeholder="000000"
                      required
                    />
                  </div>
                  {mfaError && <p className="text-sm text-red-400">{mfaError}</p>}
                  <button 
                    type="submit"
                    className="w-full rounded-lg bg-cyan-400 px-4 py-3 font-semibold text-slate-900 hover:bg-cyan-300 transition"
                  >
                    Verify & Enable
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Change Password</h2>
              <button onClick={() => setShowPasswordModal(false)} className="text-slate-400 hover:text-white text-2xl">×</button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="text-sm text-slate-300 block mb-2">Current Password</label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                  className="w-full rounded-lg border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none focus:border-cyan-400 transition"
                  required
                />
              </div>
              <div>
                <label className="text-sm text-slate-300 block mb-2">New Password</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                  className="w-full rounded-lg border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none focus:border-cyan-400 transition"
                  minLength="8"
                  required
                />
                <p className="text-xs text-slate-400 mt-1">At least 8 characters</p>
              </div>
              <div>
                <label className="text-sm text-slate-300 block mb-2">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                  className="w-full rounded-lg border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none focus:border-cyan-400 transition"
                  required
                />
              </div>
              {passwordError && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-400">
                  ✓ {passwordSuccess}
                </div>
              )}
              <button 
                type="submit"
                className="w-full rounded-lg bg-cyan-400 px-4 py-3 font-semibold text-slate-900 hover:bg-cyan-300 transition"
              >
                Update Password
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Devices Modal */}
      {showDevicesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Trusted Devices</h2>
              <button onClick={() => setShowDevicesModal(false)} className="text-slate-400 hover:text-white text-2xl">×</button>
            </div>

            <div className="space-y-3">
              {devices.map((device) => (
                <div key={device.id} className="flex items-center justify-between border border-white/10 rounded-lg p-4 bg-white/5">
                  <div className="flex items-center gap-4">
                    <div className="text-3xl">
                      {device.name.includes('iPhone') ? '📱' : device.name.includes('Windows') ? '💻' : '🖥️'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{device.name}</span>
                        {device.current && <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded">Current</span>}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {device.location} • {device.lastActive}
                      </div>
                    </div>
                  </div>
                  {!device.current && (
                    <button 
                      onClick={() => handleRemoveDevice(device.id)}
                      className="text-sm text-red-400 hover:text-red-300 transition"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Alerts Modal */}
      {showAlertsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Alert Preferences</h2>
              <button onClick={() => setShowAlertsModal(false)} className="text-slate-400 hover:text-white text-2xl">×</button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-white/10 bg-white/5">
                <div>
                  <p className="text-sm font-semibold text-white">Email notifications for new logins</p>
                  <p className="text-xs text-slate-400 mt-1">Get notified when someone logs into your account</p>
                </div>
                <input
                  type="checkbox"
                  checked={alerts.loginEmail}
                  onChange={(e) => setAlerts({...alerts, loginEmail: e.target.checked})}
                  className="h-5 w-5 rounded border-white/10"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border border-white/10 bg-white/5">
                <div>
                  <p className="text-sm font-semibold text-white">SMS alerts for new logins</p>
                  <p className="text-xs text-slate-400 mt-1">Receive text messages for login attempts</p>
                </div>
                <input
                  type="checkbox"
                  checked={alerts.loginSMS}
                  onChange={(e) => setAlerts({...alerts, loginSMS: e.target.checked})}
                  className="h-5 w-5 rounded border-white/10"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border border-white/10 bg-white/5">
                <div>
                  <p className="text-sm font-semibold text-white">Large transaction alerts</p>
                  <p className="text-xs text-slate-400 mt-1">Notify me for transactions over $1,000</p>
                </div>
                <input
                  type="checkbox"
                  checked={alerts.largeTransaction}
                  onChange={(e) => setAlerts({...alerts, largeTransaction: e.target.checked})}
                  className="h-5 w-5 rounded border-white/10"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border border-white/10 bg-white/5">
                <div>
                  <p className="text-sm font-semibold text-white">New device verification</p>
                  <p className="text-xs text-slate-400 mt-1">Require verification code for new devices</p>
                </div>
                <input
                  type="checkbox"
                  checked={alerts.newDevice}
                  onChange={(e) => setAlerts({...alerts, newDevice: e.target.checked})}
                  className="h-5 w-5 rounded border-white/10"
                />
              </div>

              <button 
                onClick={handleSaveAlerts}
                className="w-full rounded-lg bg-cyan-400 px-4 py-3 font-semibold text-slate-900 hover:bg-cyan-300 transition"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SecurityPage;
