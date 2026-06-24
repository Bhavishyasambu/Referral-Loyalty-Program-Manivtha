import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE } from '../context/AuthContext';
import Header from '../components/Header';
import { Search, Edit2, ShieldAlert, Award, User, Phone, Mail, DollarSign } from 'lucide-react';

export default function CustomerManagement() {
  const { token } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Edit modal states
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editPoints, setEditPoints] = useState('');
  const [editTier, setEditTier] = useState('Bronze');
  const [editPhone, setEditPhone] = useState('');
  const [modalMessage, setModalMessage] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, [token]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/customers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
      }
    } catch (err) {
      console.error('Error fetching customer directory:', err);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (c) => {
    setEditingCustomer(c);
    setEditPoints(c.loyalty_points.toString());
    setEditTier(c.tier);
    setEditPhone(c.phone || '');
    setModalMessage('');
    setShowModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingCustomer) return;

    try {
      const res = await fetch(`${API_BASE}/customers/${editingCustomer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          loyalty_points: parseInt(editPoints),
          tier: editTier,
          phone: editPhone
        })
      });

      if (res.ok) {
        setModalMessage('Customer details updated successfully!');
        setTimeout(() => {
          setShowModal(false);
          setEditingCustomer(null);
          fetchCustomers();
        }, 1500);
      } else {
        const data = await res.json();
        setModalMessage(data.message || 'Failed to update details.');
      }
    } catch (err) {
      console.error('Submit edit error:', err);
      setModalMessage('Server error editing profile.');
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    (c.referral_code && c.referral_code.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      <Header 
        title="Customer Directory" 
        subtitle="Manage user profiles, adjust loyalty accounts, and review tiers manually." 
      />

      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        {/* Search header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px' }}>
          <div style={{ position: 'relative', flexGrow: 1, maxWidth: '400px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              placeholder="Search by name, email, or referral code..." 
              style={{ paddingLeft: '36px', width: '100%' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Showing <strong>{filteredCustomers.length}</strong> of <strong>{customers.length}</strong> customers
          </div>
        </div>

        {/* Directory Table */}
        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>Loading customer registry...</div>
        ) : filteredCustomers.length === 0 ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>No customers found matching search filters.</div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Contact Details</th>
                  <th>Referral Code</th>
                  <th>Loyalty Tier</th>
                  <th>Loyalty Points</th>
                  <th>Total Spent</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Role: {c.role}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '13px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Mail size={12} className="text-muted" /> {c.email}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={12} className="text-muted" /> {c.phone || 'N/A'}</div>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--brand-emerald)' }}>
                      {c.referral_code}
                    </td>
                    <td>
                      <span className={`status-badge ${c.tier.toLowerCase()}`}>
                        {c.tier}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{c.loyalty_points}</td>
                    <td>₹{parseFloat(c.total_spent || 0).toLocaleString('en-IN')}</td>
                    <td>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
                        onClick={() => openEditModal(c)}
                      >
                        <Edit2 size={12} />
                        Edit Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Customer Modal */}
      {showModal && editingCustomer && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '18px' }}>Adjust Loyalty Profile</h3>
              <button 
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '18px', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleEditSubmit} style={{ padding: '24px' }}>
              {modalMessage && (
                <div style={{ padding: '10px 14px', backgroundColor: '#ECFDF5', color: '#059669', borderRadius: '6px', fontSize: '13px', marginBottom: '16px', border: '1px solid #6EE7B7' }}>
                  {modalMessage}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ backgroundColor: '#F8FAFC', padding: '12px 16px', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>{editingCustomer.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{editingCustomer.email}</div>
                </div>

                <div className="form-group">
                  <label>Manually Update Loyalty Points Balance</label>
                  <input 
                    type="number" 
                    value={editPoints}
                    onChange={(e) => setEditPoints(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Adjust Customer Loyalty Tier</label>
                  <select value={editTier} onChange={(e) => setEditTier(e.target.value)}>
                    <option value="Bronze">Bronze (1.0x)</option>
                    <option value="Silver">Silver (1.2x)</option>
                    <option value="Gold">Gold (1.5x)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Update Phone Number</label>
                  <input 
                    type="text" 
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Adjustments
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
