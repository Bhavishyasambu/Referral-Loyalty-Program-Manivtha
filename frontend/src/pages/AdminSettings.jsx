import { useState, useEffect } from 'react';
import { useAuth, API_BASE } from '../context/AuthContext';
import Header from '../components/Header';
import { Plus, ToggleLeft, ToggleRight, Calendar, Percent, Sparkles, Tag, Check } from 'lucide-react';

export default function AdminSettings() {
  const { token } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Campaign Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [multiplier, setMultiplier] = useState('1.0');
  const [discount, setDiscount] = useState('0');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Alerts
  const [alert, setAlert] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchCampaigns();
  }, [token]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/campaigns`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data);
      }
    } catch (err) {
      console.error('Error fetching campaigns list:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (camp) => {
    try {
      const nextActive = !camp.is_active;
      const res = await fetch(`${API_BASE}/campaigns/${camp.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: nextActive })
      });
      if (res.ok) {
        setCampaigns(prev => prev.map(c => c.id === camp.id ? { ...c, is_active: nextActive } : c));
      }
    } catch (err) {
      console.error('Toggle status error:', err);
    }
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    setAlert({ text: '', type: '' });

    if (!name || !code || !multiplier || !startDate || !endDate) {
      setAlert({ text: 'Please fill in all required campaign fields.', type: 'error' });
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          code: code.trim().toUpperCase(),
          description,
          points_multiplier: parseFloat(multiplier),
          discount_percent: parseFloat(discount),
          start_date: startDate,
          end_date: endDate
        })
      });

      const data = await res.json();

      if (res.ok) {
        setAlert({ text: 'Marketing campaign created successfully!', type: 'success' });
        // Reset form
        setName('');
        setCode('');
        setDescription('');
        setMultiplier('1.0');
        setDiscount('0');
        setStartDate('');
        setEndDate('');

        // Refresh campaign listing
        fetchCampaigns();
      } else {
        setAlert({ text: data.message || 'Failed to create campaign.', type: 'error' });
      }
    } catch (err) {
      console.error('Create campaign error:', err);
      setAlert({ text: `Frontend Catch Error: ${err.message}`, type: 'error' });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      <Header 
        title="Campaign Management" 
        subtitle="Launch promotional codes, double points weekends, or seasonal discounts." 
      />

      <div className="dashboard-row">
        {/* Left Side: Create Campaign Form */}
        <div className="glass-card">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles style={{ color: 'var(--brand-navy)' }} size={18} />
            Create Campaign Promo
          </h2>

          {alert.text && (
            <div 
              style={{ 
                padding: '10px 14px', 
                borderRadius: '8px', 
                marginBottom: '16px', 
                fontSize: '13px',
                backgroundColor: alert.type === 'success' ? '#ECFDF5' : '#FEF2F2',
                color: alert.type === 'success' ? '#059669' : '#DC2626',
                border: `1px solid ${alert.type === 'success' ? '#6EE7B7' : '#FCA5A5'}`
              }}
            >
              {alert.text}
            </div>
          )}

          <form onSubmit={handleCreateCampaign} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group">
              <label>Campaign Name *</label>
              <input 
                type="text" 
                placeholder="e.g. Summer Double Points"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Promo Code *</label>
                <input 
                  type="text" 
                  placeholder="e.g. SUMMER2X"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <input 
                  type="text" 
                  placeholder="e.g. Earn 2x points on bookings"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Loyalty Points Multiplier *</label>
                <select value={multiplier} onChange={(e) => setMultiplier(e.target.value)}>
                  <option value="1.0">1.0x (Standard)</option>
                  <option value="1.2">1.2x Multiplier</option>
                  <option value="1.5">1.5x Multiplier</option>
                  <option value="2.0">2.0x Double Points</option>
                  <option value="3.0">3.0x Triple Points</option>
                </select>
              </div>

              <div className="form-group">
                <label>Booking Discount Percentage *</label>
                <div style={{ position: 'relative' }}>
                  <Percent size={14} style={{ position: 'absolute', right: '16px', top: '15px', color: 'var(--text-secondary)' }} />
                  <select value={discount} onChange={(e) => setDiscount(e.target.value)}>
                    <option value="0">0% (No discount)</option>
                    <option value="5">5% Discount</option>
                    <option value="10">10% Discount</option>
                    <option value="15">15% Discount</option>
                    <option value="20">20% Discount</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Campaign Start Date *</label>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Campaign End Date *</label>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: '10px' }}>
              <Plus size={16} />
              Launch Promo Campaign
            </button>
          </form>
        </div>

        {/* Right Side: Campaigns Listing */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>Campaign Directory</h2>

          {loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>Loading campaigns...</div>
          ) : campaigns.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>No campaigns launched yet. Use the promo builder to launch.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flexGrow: 1, maxHeight: '500px' }}>
              {campaigns.map((camp) => {
                const todayStr = new Date().toLocaleDateString('en-CA');
                const isManuallyActive = camp.is_active === 1 || camp.is_active === true;
                const isDateValid = camp.start_date <= todayStr && camp.end_date >= todayStr;
                const isEffectivelyActive = isManuallyActive && isDateValid;
                
                let statusText = 'Inactive';
                let statusColor = 'var(--text-muted)';
                if (isManuallyActive) {
                  if (camp.start_date > todayStr) {
                    statusText = 'Scheduled';
                    statusColor = '#D97706'; // Amber
                  } else if (camp.end_date < todayStr) {
                    statusText = 'Expired';
                    statusColor = '#DC2626'; // Red
                  } else {
                    statusText = 'Active';
                    statusColor = 'var(--brand-emerald)';
                  }
                }

                return (
                <div 
                  key={camp.id}
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
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600, fontSize: '15px' }}>{camp.name}</span>
                      <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--brand-emerald)', marginTop: '2px' }}>Code: {camp.code}</span>
                    </div>
                    <div style={{ cursor: 'pointer' }} onClick={() => handleToggleStatus(camp)}>
                      {isEffectivelyActive ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: statusColor, fontSize: '12px', fontWeight: 600 }}>
                          <span>{statusText}</span>
                          <ToggleRight size={24} color={statusColor} />
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: statusColor, fontSize: '12px', fontWeight: 600 }}>
                          <span>{statusText}</span>
                          <ToggleLeft size={24} color={statusColor} />
                        </div>
                      )}
                    </div>
                  </div>

                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{camp.description}</p>
                  
                  <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-light)', paddingTop: '8px' }}>
                    <span>Start: {new Date(camp.start_date).toLocaleDateString('en-IN')}</span>
                    <span>End: {new Date(camp.end_date).toLocaleDateString('en-IN')}</span>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', fontSize: '12px', fontWeight: 600 }}>
                    {parseFloat(camp.points_multiplier) > 1.0 && (
                      <span style={{ color: 'var(--brand-emerald)' }}>{camp.points_multiplier}x Loyalty Points</span>
                    )}
                    {parseFloat(camp.discount_percent) > 0 && (
                      <span style={{ color: 'var(--brand-navy)' }}>{camp.discount_percent}% Off Checkout</span>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
