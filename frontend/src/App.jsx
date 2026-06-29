import { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import './App.css';

// Component imports
import Sidebar from './components/Sidebar';
import HomeDashboard from './pages/HomeDashboard';
import BookingHistory from './pages/BookingHistory';
import LoyaltyDashboard from './pages/LoyaltyDashboard';
import ReferralManagement from './pages/ReferralManagement';
import RewardsDiscounts from './pages/RewardsDiscounts';
import CustomerManagement from './pages/CustomerManagement';
import AdminSettings from './pages/AdminSettings';
import AnalyticsReports from './pages/AnalyticsReports';
import StaffDashboard from './pages/StaffDashboard';
import WorkflowAssistant from './pages/WorkflowAssistant';
import BookingDetail from './pages/BookingDetail';
import UserProfile from './pages/UserProfile';

import { MapPin, Lock, Mail, User, Phone, Share2, Eye, EyeOff } from 'lucide-react';

function App() {
  const { user, token, loading, login, register, forgotPassword, resetPassword } = useAuth();
  const [activePage, setActivePage] = useState('home');

  // Auth pages view toggles ('login', 'register', 'forgot', 'reset')
  const [authMode, setAuthMode] = useState('login');
  const [resetToken, setResetToken] = useState('');
  const [resetUserId, setResetUserId] = useState('');

  // Form inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [refCodeUsed, setRefCodeUsed] = useState('');

  // Messages
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    // Check for reset password token in URL
    const params = new URLSearchParams(window.location.search);
    const rToken = params.get('resetToken');
    const uId = params.get('userId');
    if (rToken && uId) {
      setResetToken(rToken);
      setResetUserId(uId);
      setAuthMode('reset');
    }
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-primary)', color: 'var(--brand-navy)', fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700 }}>
        Travel Operations Loading...
      </div>
    );
  }

  // Handle Login submission
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setAuthLoading(true);

    try {
      await login(email, password);
      setSuccessMsg('Signed in successfully!');
      // Reset form
      setEmail('');
      setPassword('');
      setActivePage('home');
    } catch (err) {
      setErrorMsg(err.message || 'Login failed. Please check credentials.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle Register submission
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setAuthLoading(true);

    try {
      await register(name, email, phone, password, refCodeUsed);
      setSuccessMsg('Registered successfully! Logging you in...');
      
      // Auto-login after registration
      await login(email, password);
      
      // Reset form fields
      setName('');
      setEmail('');
      setPhone('');
      setPassword('');
      setRefCodeUsed('');
      setActivePage('home');
    } catch (err) {
      setErrorMsg(err.message || 'Registration failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setAuthLoading(true);
    try {
      const res = await forgotPassword(email);
      setSuccessMsg(res.message);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setAuthLoading(true);
    try {
      const res = await resetPassword(resetUserId, resetToken, password);
      setSuccessMsg(res.message);
      setTimeout(() => {
        setAuthMode('login');
        setPassword('');
        window.history.replaceState({}, document.title, "/"); // Clear URL params
      }, 3000);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  // Render Authentication page if not signed in
  if (!token || !user) {
    return (
      <div className="auth-page">
        <div className="glass-card auth-card">
          <div className="auth-header">
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <MapPin size={32} style={{ color: 'var(--brand-emerald)' }} />
            </div>
            <h2>Travel Rewards</h2>
            <p>
              {authMode === 'register' && 'Join our Referral & Loyalty program to earn bonuses.'}
              {authMode === 'login' && 'Sign in to access your referral stats, bookings, and rewards.'}
              {authMode === 'forgot' && 'Enter your email to receive a password reset link.'}
              {authMode === 'reset' && 'Enter your new password below.'}
            </p>
          </div>

          {errorMsg && (
            <div style={{ padding: '10px 14px', backgroundColor: '#FEF2F2', color: '#DC2626', borderRadius: '6px', fontSize: '13px', marginBottom: '20px', border: '1px solid #FCA5A5' }}>
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div style={{ padding: '10px 14px', backgroundColor: '#ECFDF5', color: '#059669', borderRadius: '6px', fontSize: '13px', marginBottom: '20px', border: '1px solid #6EE7B7' }}>
              {successMsg}
            </div>
          )}

          {authMode === 'register' && (
            /* Registration Form */
            <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label>Full Name *</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-secondary)' }} />
                  <input 
                    type="text" 
                    placeholder="e.g. John Doe"
                    style={{ paddingLeft: '36px', width: '100%' }}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Email Address *</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-secondary)' }} />
                  <input 
                    type="email" 
                    placeholder="name@example.com"
                    style={{ paddingLeft: '36px', width: '100%' }}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Phone Number *</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-secondary)' }} />
                  <input 
                    type="tel" 
                    placeholder="e.g. +1 555-0199"
                    style={{ paddingLeft: '36px', width: '100%' }}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Password *</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-secondary)' }} />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••"
                    style={{ paddingLeft: '36px', paddingRight: '40px', width: '100%' }}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  {password.length > 0 && (
                    <div 
                      style={{ position: 'absolute', right: '12px', top: '15px', color: 'var(--text-secondary)', cursor: 'pointer' }}
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Referral Code (Optional)</label>
                <div style={{ position: 'relative' }}>
                  <Share2 size={16} style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-secondary)' }} />
                  <input 
                    type="text" 
                    placeholder="e.g. TRV-XXXX"
                    style={{ paddingLeft: '36px', width: '100%' }}
                    value={refCodeUsed}
                    onChange={(e) => setRefCodeUsed(e.target.value)}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={authLoading}>
                {authLoading ? 'Signing up...' : 'Create Account'}
              </button>

              <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                Already have an account?{' '}
                <span 
                  style={{ color: 'var(--brand-emerald)', cursor: 'pointer', fontWeight: 600 }}
                  onClick={() => {
                    setAuthMode('login');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                >
                  Sign In
                </span>
              </div>
            </form>
          )}

          {authMode === 'login' && (
            /* Login Form */
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-secondary)' }} />
                  <input 
                    type="email" 
                    placeholder="name@example.com"
                    style={{ paddingLeft: '36px', width: '100%' }}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-secondary)' }} />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••"
                    style={{ paddingLeft: '36px', paddingRight: '40px', width: '100%' }}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  {password.length > 0 && (
                    <div 
                      style={{ position: 'absolute', right: '12px', top: '15px', color: 'var(--text-secondary)', cursor: 'pointer' }}
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </div>
                  )}
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={authLoading}>
                {authLoading ? 'Signing in...' : 'Sign In'}
              </button>

              <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                <span 
                  style={{ color: 'var(--brand-emerald)', cursor: 'pointer', fontWeight: 600 }}
                  onClick={() => {
                    setAuthMode('forgot');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                >
                  Forgot Password?
                </span>
              </div>

              <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                Don't have an account?{' '}
                <span 
                  style={{ color: 'var(--brand-emerald)', cursor: 'pointer', fontWeight: 600 }}
                  onClick={() => {
                    setAuthMode('register');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                >
                  Create Account
                </span>
              </div>
            </form>
          )}

          {authMode === 'forgot' && (
            <form onSubmit={handleForgotPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-secondary)' }} />
                  <input 
                    type="email" 
                    placeholder="name@example.com"
                    style={{ paddingLeft: '36px', width: '100%' }}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={authLoading}>
                {authLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
              <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                Remembered your password?{' '}
                <span 
                  style={{ color: 'var(--brand-emerald)', cursor: 'pointer', fontWeight: 600 }}
                  onClick={() => {
                    setAuthMode('login');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                >
                  Sign In
                </span>
              </div>
            </form>
          )}

          {authMode === 'reset' && (
            <form onSubmit={handleResetPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label>New Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-secondary)' }} />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••"
                    style={{ paddingLeft: '36px', paddingRight: '40px', width: '100%' }}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  {password.length > 0 && (
                    <div 
                      style={{ position: 'absolute', right: '12px', top: '15px', color: 'var(--text-secondary)', cursor: 'pointer' }}
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </div>
                  )}
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={authLoading}>
                {authLoading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <main className="main-content">
        <div style={{ display: activePage === 'home' || activePage === '' ? 'block' : 'none' }}>
          <HomeDashboard setActivePage={setActivePage} />
        </div>
        <div style={{ display: activePage === 'bookings' ? 'block' : 'none' }}>
          <BookingHistory />
        </div>
        <div style={{ display: activePage === 'loyalty' ? 'block' : 'none' }}>
          <LoyaltyDashboard />
        </div>
        <div style={{ display: activePage === 'referrals' ? 'block' : 'none' }}>
          <ReferralManagement />
        </div>
        <div style={{ display: activePage === 'rewards' ? 'block' : 'none' }}>
          <RewardsDiscounts />
        </div>
        <div style={{ display: activePage === 'customers' ? 'block' : 'none' }}>
          <CustomerManagement />
        </div>
        <div style={{ display: activePage === 'campaigns' ? 'block' : 'none', width: '100%' }}>
          <AdminSettings />
        </div>
        <div style={{ display: activePage === 'profile' ? 'block' : 'none', width: '100%' }}>
          <UserProfile />
        </div>
        <div style={{ display: activePage === 'analytics' ? 'block' : 'none' }}>
          <AnalyticsReports />
        </div>
        <div style={{ display: activePage === 'staff' ? 'block' : 'none' }}>
          <StaffDashboard setActivePage={setActivePage} />
        </div>
        <div style={{ display: activePage === 'workflow' ? 'block' : 'none' }}>
          <WorkflowAssistant />
        </div>
        {activePage.startsWith('detail_') && (
          <div style={{ display: 'block' }}>
            <BookingDetail setActivePage={setActivePage} bookingId={activePage.split('_')[1]} />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
