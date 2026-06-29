import { useState, useEffect } from 'react';
import { useAuth, API_BASE } from '../context/AuthContext';
import Header from '../components/Header';
import { User, Mail, Phone, Save, ShieldCheck } from 'lucide-react';

export default function UserProfile() {
  const { user, customer, token, refreshProfile } = useAuth();
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
    }
    if (customer) {
      setPhone(customer.phone || '');
    }
  }, [user, customer]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, phone })
      });

      const data = await res.json();
      
      if (res.ok) {
        setMessage({ text: 'Profile updated successfully!', type: 'success' });
        // Refresh global auth context to reflect new name across app
        await refreshProfile();
      } else {
        setMessage({ text: data.message || 'Failed to update profile.', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Server error updating profile.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, maxWidth: '800px', margin: '0 auto', width: '100%' }}>
      <Header 
        title="My Profile" 
        subtitle="Manage your personal information and account settings." 
      />

      <div className="glass-card" style={{ marginTop: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px', paddingBottom: '24px', borderBottom: '1px solid var(--border-light)' }}>
          <div style={{ 
            width: '64px', height: '64px', borderRadius: '50%', 
            background: 'var(--brand-navy)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px', fontWeight: 700, color: '#fff'
          }}>
            {name ? name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 600 }}>{user?.email}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--brand-emerald)', marginTop: '4px' }}>
              <ShieldCheck size={14} />
              {user?.role === 'admin' ? 'Administrator Account' : 'Customer Account'}
            </div>
          </div>
        </div>

        {message.text && (
          <div style={{ 
            padding: '14px', 
            borderRadius: '8px', 
            marginBottom: '24px', 
            backgroundColor: message.type === 'success' ? '#ECFDF5' : '#FEF2F2',
            color: message.type === 'success' ? '#059669' : '#DC2626',
            border: `1px solid ${message.type === 'success' ? '#6EE7B7' : '#FCA5A5'}`
          }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="form-group">
            <label>Full Name</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-secondary)' }} />
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                style={{ paddingLeft: '42px' }}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-secondary)' }} />
              <input 
                type="email" 
                value={user?.email || ''}
                disabled
                style={{ paddingLeft: '42px', backgroundColor: '#F1F5F9', cursor: 'not-allowed', color: 'var(--text-muted)' }}
              />
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>Email address cannot be changed for security reasons.</span>
          </div>

          {user?.role === 'customer' && (
            <div className="form-group">
              <label>Phone Number</label>
              <div style={{ position: 'relative' }}>
                <Phone size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-secondary)' }} />
                <input 
                  type="tel" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter your phone number"
                  style={{ paddingLeft: '42px' }}
                />
              </div>
            </div>
          )}

          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Save size={18} />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
