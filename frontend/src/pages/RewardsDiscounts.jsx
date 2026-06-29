import { useState, useEffect } from 'react';
import { useAuth, API_BASE } from '../context/AuthContext';
import Header from '../components/Header';
import { Gift, Award, CheckCircle, Tag, DollarSign, Calendar } from 'lucide-react';

export default function RewardsDiscounts() {
  const { token, customer, refreshProfile } = useAuth();
  const [rewards, setRewards] = useState([]);
  const [myRedemptions, setMyRedemptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [redeemingId, setRedeemingId] = useState(null);
  
  // Message alerts
  const [alert, setAlert] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchRewardsData();
  }, [token]);

  const fetchRewardsData = async () => {
    try {
      setLoading(true);
      // Available rewards
      const rewRes = await fetch(`${API_BASE}/rewards`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (rewRes.ok) {
        const rewData = await rewRes.json();
        setRewards(rewData);
      }

      // My redemptions
      const redRes = await fetch(`${API_BASE}/rewards/my-redemptions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (redRes.ok) {
        const redData = await redRes.json();
        setMyRedemptions(redData);
      }
    } catch (err) {
      console.error('Error fetching rewards data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (reward) => {
    setAlert({ text: '', type: '' });
    if (!customer || customer.loyalty_points < reward.points_cost) {
      setAlert({ text: 'Insufficient loyalty points to redeem this reward.', type: 'error' });
      return;
    }

    try {
      setRedeemingId(reward.id);
      const res = await fetch(`${API_BASE}/rewards/redeem`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rewardId: reward.id })
      });

      const data = await res.json();

      if (res.ok) {
        try {
          await navigator.clipboard.writeText(data.voucherCode);
        } catch (clipErr) {
          console.error("Clipboard copy failed", clipErr);
        }

        setAlert({ 
          text: `Redemption Successful! Voucher Code: ${data.voucherCode} (Copied to Clipboard!)`, 
          type: 'success' 
        });
        
        // Refresh local data & header notification bell
        fetchRewardsData();
        refreshProfile();
      } else {
        setAlert({ text: data.message || 'Redemption failed.', type: 'error' });
      }
    } catch (err) {
      console.error('Redemption error:', err);
      setAlert({ text: 'Server error processing redemption.', type: 'error' });
    } finally {
      setRedeemingId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      <Header 
        title="Rewards Catalog" 
        subtitle="Spend your loyalty points to unlock discount vouchers and luxury trip upgrades." 
      />

      {alert.text && (
        <div 
          style={{ 
            padding: '14px 18px', 
            borderRadius: '10px', 
            marginBottom: '24px', 
            fontSize: '14px',
            backgroundColor: alert.type === 'success' ? '#ECFDF5' : '#FEF2F2',
            color: alert.type === 'success' ? '#059669' : '#DC2626',
            border: `1px solid ${alert.type === 'success' ? '#6EE7B7' : '#FCA5A5'}`,
            lineHeight: 1.5
          }}
        >
          {alert.text}
        </div>
      )}

      {/* Rewards Catalog Grid */}
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Gift style={{ color: 'var(--brand-navy)' }} size={20} />
        Redeemable Rewards
      </h2>

      {loading ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>Loading catalog...</div>
      ) : (
        <div className="vouchers-grid" style={{ marginBottom: '40px' }}>
          {rewards.map((r) => {
            const isAffordable = customer?.loyalty_points >= r.points_cost;
            return (
              <div key={r.id} className="glass-card voucher-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <span 
                    style={{ 
                      fontSize: '11px', 
                      fontWeight: 700, 
                      textTransform: 'uppercase', 
                      backgroundColor: '#ECFDF5', 
                      color: 'var(--brand-emerald)', 
                      padding: '4px 8px', 
                      borderRadius: '4px' 
                    }}
                  >
                    {r.reward_type}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <Award size={14} style={{ color: 'var(--brand-navy)' }} />
                    <strong style={{ color: 'var(--text-primary)' }}>{r.points_cost}</strong> pts
                  </div>
                </div>

                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>{r.name}</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4, flexGrow: 1, marginBottom: '20px' }}>
                  {r.description}
                </p>

                <button 
                  className={`btn ${isAffordable ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ width: '100%', cursor: isAffordable ? 'pointer' : 'not-allowed', opacity: isAffordable ? 1 : 0.6 }}
                  disabled={!isAffordable || redeemingId === r.id}
                  onClick={() => handleRedeem(r)}
                >
                  {redeemingId === r.id ? 'Redeeming...' : isAffordable ? 'Redeem Voucher' : `Need ${r.points_cost - (customer?.loyalty_points || 0)} more pts`}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Redeemed Coupons Lists */}
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Tag style={{ color: 'var(--brand-navy)' }} size={20} />
        My Redeemed Vouchers
      </h2>

      {loading ? (
        <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)' }}>Loading coupons...</div>
      ) : myRedemptions.length === 0 ? (
        <div className="glass-card" style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
          You have not redeemed any vouchers yet. Earn points by travel booking to redeem!
        </div>
      ) : (
        <div className="vouchers-grid">
          {myRedemptions.map((red) => (
            <div 
              key={red.id} 
              className="glass-card" 
              style={{ 
                borderLeft: `4px solid ${red.status === 'Active' ? 'var(--brand-emerald)' : 'var(--border-light)'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: '15px' }}>{red.reward_name}</span>
                <span className={`status-badge ${red.status.toLowerCase()}`}>{red.status === 'Active' ? 'Unused' : red.status}</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{red.reward_description}</p>
              
              <div className="voucher-code-display">
                {red.code_generated}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-light)', paddingTop: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={12} />
                  <span>Redeemed: {new Date(red.redeemed_at).toLocaleDateString('en-IN')}</span>
                </div>
                <span>Cost: {red.points_spent} pts</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
