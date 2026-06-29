import { useState, useEffect } from 'react';
import { useAuth, API_BASE } from '../context/AuthContext';
import Header from '../components/Header';
import { Copy, Check, Users, Send, Gift, ShieldCheck } from 'lucide-react';

export default function ReferralManagement() {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [referralsList, setReferralsList] = useState([]);
  const [copied, setCopied] = useState(false);
  const [friendEmail, setFriendEmail] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReferralData();
  }, [token]);

  const fetchReferralData = async () => {
    try {
      setLoading(true);
      // Stats
      const statsRes = await fetch(`${API_BASE}/referrals/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // List
      const listRes = await fetch(`${API_BASE}/referrals/list`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (listRes.ok) {
        const listData = await listRes.json();
        setReferralsList(listData);
      }
    } catch (err) {
      console.error('Error fetching referrals details:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!stats?.referralCode) return;
    navigator.clipboard.writeText(stats.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    setInviteMessage('');
    if (!friendEmail) return;

    // Use stats.referralCode if available, fallback to empty string
    const referralCode = stats?.referralCode || '';

    try {
      // Calling the new Vercel Serverless Function instead of the Render backend
      const res = await fetch(`/api/send-email`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ friendEmail, referralCode })
      });
      const data = await res.json();
      if (res.ok) {
        setInviteMessage(data.message || 'Invitation sent successfully!');
        setFriendEmail('');
      } else {
        setInviteMessage(data.message || 'Failed to send invite.');
      }
    } catch (err) {
      setInviteMessage('Server error sending invitation.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      <Header 
        title="Referral Program" 
        subtitle="Invite your friends to Travel Rewards. Earn bonus points when they take their first trip." 
      />

      {/* Stats row */}
      <div className="stats-grid">
        <div className="glass-card stat-card">
          <div className="stat-icon-wrapper">
            <Users size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Total Referrals</div>
            <div className="stat-value">{stats?.totalReferrals || 0}</div>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon-wrapper emerald">
            <ShieldCheck size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Trips Completed</div>
            <div className="stat-value">{stats?.completedReferrals || 0}</div>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon-wrapper amber">
            <Users size={24} style={{ opacity: 0.7 }} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Pending Bookings</div>
            <div className="stat-value">{stats?.pendingReferrals || 0}</div>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon-wrapper violet">
            <Gift size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Total Points Earned</div>
            <div className="stat-value">{stats?.pointsEarned || 0} pts</div>
          </div>
        </div>
      </div>

      <div className="dashboard-row">
        {/* Left Side: Code display & Inviter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Share Code Card */}
          <div className="glass-card">
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Your Referral Code</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.5 }}>
              Share this code with friends. They will receive <strong>100 loyalty points</strong> on signup, and you will get <strong>250 loyalty points</strong> once they complete their first trip!
            </p>
            
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div 
                style={{ 
                  flexGrow: 1, 
                  backgroundColor: '#F8FAFC', 
                  border: '1px solid var(--border-light)', 
                  padding: '14px', 
                  borderRadius: '8px', 
                  fontFamily: 'monospace', 
                  fontSize: '20px', 
                  textAlign: 'center',
                  letterSpacing: '1px',
                  fontWeight: 700,
                  color: 'var(--brand-emerald)'
                }}
              >
                {stats?.referralCode || 'GENERATING...'}
              </div>
              <button 
                className="btn btn-primary" 
                style={{ height: '52px', width: '52px', padding: 0 }}
                onClick={copyToClipboard}
              >
                {copied ? <Check size={20} /> : <Copy size={20} />}
              </button>
            </div>
          </div>

          {/* Email Inviter Card */}
          <div className="glass-card">
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Send size={18} style={{ color: 'var(--brand-navy)' }} />
              Send Email Invitation
            </h2>

            {inviteMessage && (
              <div style={{ padding: '10px 14px', backgroundColor: '#ECFDF5', color: '#059669', borderRadius: '6px', fontSize: '13px', marginBottom: '14px', border: '1px solid #6EE7B7' }}>
                {inviteMessage}
              </div>
            )}

            <form onSubmit={handleSendInvite} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label>Friend's Email Address</label>
                <input 
                  type="email" 
                  placeholder="name@example.com"
                  value={friendEmail}
                  onChange={(e) => setFriendEmail(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-secondary">
                Send Invitation Link
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: Referrals List Tracker */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>Referral Status Tracker</h2>

          {loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>Loading tracker data...</div>
          ) : referralsList.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              No referees joined yet. Invite friends using your code to start tracking!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flexGrow: 1, maxHeight: '420px' }}>
              {referralsList.map((ref) => (
                <div 
                  key={ref.id}
                  style={{ 
                    padding: '16px', 
                    borderRadius: '8px', 
                    backgroundColor: '#F8FAFC', 
                    border: '1px solid var(--border-light)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>{ref.referee_name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{ref.referee_email}</div>
                    </div>
                    <span className={`status-badge ${ref.status.toLowerCase()}`}>
                      {ref.status === 'Pending' ? 'Registered' : 'Trip Completed'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-light)', paddingTop: '8px' }}>
                    <span>Joined: {new Date(ref.referral_date).toLocaleDateString('en-IN')}</span>
                    {ref.status === 'Completed' ? (
                      <span style={{ color: 'var(--brand-emerald)', fontWeight: 600 }}>+250 Points Awarded</span>
                    ) : (
                      <span>Awaiting Booking</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
