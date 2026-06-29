import { useState, useEffect } from 'react';
import { useAuth, API_BASE } from '../context/AuthContext';
import Header from '../components/Header';
import { Award, Check, TrendingUp, Calendar, Gift, ArrowUpRight, Medal, Crown } from 'lucide-react';

export default function LoyaltyDashboard() {
  const { token } = useAuth();
  const [loyaltyData, setLoyaltyData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLoyaltyDetails();
  }, [token]);

  const fetchLoyaltyDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/loyalty/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLoyaltyData(data);
      }
    } catch (err) {
      console.error('Error fetching loyalty dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        <Header title="Loyalty Points Dashboard" subtitle="Loading..." />
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>Loading loyalty dashboard...</div>
      </div>
    );
  }

  const { summary, history } = loyaltyData || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      <Header 
        title="Loyalty Points Dashboard" 
        subtitle="Upgrade your tier status to earn reward point multipliers and premium perks." 
      />

      {/* Tiers Container */}
      <div className="tiers-container">
        {/* Bronze Card */}
        <div className={`glass-card tier-card bronze ${summary?.tier === 'Bronze' ? 'active-tier' : ''}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="tier-badge">Bronze</span>
            {summary?.tier === 'Bronze' && <span className="status-badge active" style={{ fontSize: '10px' }}>Active</span>}
          </div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, margin: '8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Medal size={24} style={{ color: '#CD7F32' }} /> Bronze Tier
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Entry-level tier for all members. Start your journey here.
          </p>
          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '12px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Points Multiplier:</span>
              <span style={{ fontWeight: 600 }}>1.0x</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Requirement:</span>
              <span style={{ fontWeight: 600 }}>Default Sign up</span>
            </div>
          </div>
        </div>

        {/* Silver Card */}
        <div className={`glass-card tier-card silver ${summary?.tier === 'Silver' ? 'active-tier' : ''}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="tier-badge">Silver</span>
            {summary?.tier === 'Silver' && <span className="status-badge active" style={{ fontSize: '10px' }}>Active</span>}
          </div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, margin: '8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={24} style={{ color: '#C0C0C0' }} /> Silver Tier
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Unlock extra benefits and faster points accrual.
          </p>
          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '12px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Points Multiplier:</span>
              <span style={{ fontWeight: 600, color: 'var(--brand-emerald)' }}>1.2x</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Requirement:</span>
              <span style={{ fontWeight: 600 }}>₹100,000+ Spent or 500+ pts</span>
            </div>
          </div>
        </div>

        {/* Gold Card */}
        <div className={`glass-card tier-card gold ${summary?.tier === 'Gold' ? 'active-tier' : ''}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="tier-badge">Gold</span>
            {summary?.tier === 'Gold' && <span className="status-badge active" style={{ fontSize: '10px' }}>Active</span>}
          </div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, margin: '8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Crown size={24} style={{ color: '#FFD700' }} /> Gold Tier
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Elite loyalty benefits. Maximum rewards on all bookings.
          </p>
          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '12px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Points Multiplier:</span>
              <span style={{ fontWeight: 600, color: 'var(--brand-amber)' }}>1.5x</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Requirement:</span>
              <span style={{ fontWeight: 600 }}>₹300,000+ Spent or 1,500+ pts</span>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-row">
        {/* Tier Progress */}
        <div className="glass-card">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={20} style={{ color: 'var(--brand-navy)' }} />
            Tier Progress Tracker
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Current Points Balance:</span>
                <div style={{ fontSize: '32px', fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--brand-emerald)', marginTop: '4px' }}>
                  {summary?.loyaltyPoints} <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500 }}>Points</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Total Accumulative Spend:</span>
                <div style={{ fontSize: '32px', fontFamily: 'var(--font-display)', fontWeight: 800, marginTop: '4px' }}>
                  ₹{summary?.totalSpent?.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {summary?.tier !== 'Gold' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                  <span>Progress to {summary?.tierConfig?.next} Tier</span>
                  <span>{summary?.progressPercent}%</span>
                </div>
                <div style={{ height: '8px', width: '100%', backgroundColor: 'var(--bg-slate)', borderRadius: '99px', overflow: 'hidden', border: '1px solid var(--border-light)' }}>
                  <div style={{ height: '100%', width: `${summary?.progressPercent}%`, background: 'var(--brand-emerald)', borderRadius: '99px' }} />
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.4 }}>
                  💡 Tip: You can unlock {summary?.tierConfig?.next} tier by spending ₹{summary?.tierConfig?.spentNeeded} total, or earning {summary?.tierConfig?.pointsNeeded} loyalty points historically!
                </div>
              </div>
            )}

            {summary?.tier === 'Gold' && (
              <div 
                style={{ 
                  padding: '16px', 
                  backgroundColor: 'rgba(245, 158, 11, 0.1)', 
                  border: '1px solid rgba(245, 158, 11, 0.3)', 
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', color: 'var(--brand-amber)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Award size={20} />
                </div>
                <div>
                  <h4 style={{ fontWeight: 600, fontSize: '14px', color: 'var(--brand-amber)' }}>Ultimate Status Unlocked!</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    You have achieved Gold Tier status! You are earning maximum point multipliers (1.5x) on every booking.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Points Transaction History */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={20} style={{ color: 'var(--brand-navy)' }} />
            Loyalty Audit Logs
          </h2>

          {history?.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', flexGrow: 1 }}>
              No transactions recorded yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flexGrow: 1, maxHeight: '350px' }}>
              {history?.map((log, index) => (
                <div 
                  key={index} 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '12px 14px', 
                    borderRadius: '8px', 
                    backgroundColor: 'var(--bg-slate)',
                    border: '1px solid var(--border-light)'
                  }}
                >
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div 
                      style={{ 
                        width: '32px', 
                        height: '32px', 
                        borderRadius: '6px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: log.points > 0 ? 'var(--brand-emerald)' : 'var(--brand-red)',
                        backgroundColor: log.points > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'
                      }}
                    >
                      {log.points > 0 ? <ArrowUpRight size={16} /> : <Gift size={16} />}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>{log.type}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{log.description}</div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: log.points > 0 ? 'var(--brand-emerald)' : 'var(--brand-red)' }}>
                      {log.points > 0 ? `+${log.points}` : log.points}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {new Date(log.date).toLocaleDateString('en-IN')}
                    </div>
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
