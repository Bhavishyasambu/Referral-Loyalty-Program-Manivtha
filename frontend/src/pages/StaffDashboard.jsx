import { useState, useEffect } from 'react';
import Header from '../components/Header';
import { useAuth, API_BASE } from '../context/AuthContext';
import { RefreshCw, Filter, Download, ArrowRight, AlertCircle } from 'lucide-react';

export default function StaffDashboard({ setActivePage }) {
  const { token, user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterDate, setFilterDate] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchBookings = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`${API_BASE}/bookings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
      }
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
    } finally {
      setLoading(false);
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  useEffect(() => {
    fetchBookings();
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchBookings, 60000);
    return () => clearInterval(interval);
  }, [token]);

  // Handle Download CSV
  const downloadCSV = () => {
    window.open(`${API_BASE}/export/csv?token=${token}`, '_blank');
  };

  // Handle Download PDF
  const downloadPDF = () => {
    window.open(`${API_BASE}/export/pdf?token=${token}`, '_blank');
  };

  const filteredBookings = bookings.filter(b => {
    if (filterStatus !== 'All' && b.status !== filterStatus) return false;
    if (filterDate && !b.trip_date.startsWith(filterDate)) return false;
    return true;
  });

  const getStatusBadge = (status) => {
    const s = status.toLowerCase();
    if (s === 'confirmed' || s === 'completed') return 'status-badge confirmed';
    if (s === 'pending') return 'status-badge pending';
    return 'status-badge cancelled';
  };

  if (user?.role !== 'admin') {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#DC2626' }}>
        <h2>Access Denied</h2>
        <p>You do not have staff permissions to view this dashboard.</p>
      </div>
    );
  }

  return (
    <>
      <Header 
        title="Central Staff Dashboard" 
        subtitle="Manage fleet operations, bookings, and monitor trip status." 
      />

      <div className="glass-card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F1F5F9', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
              <Filter size={16} style={{ color: 'var(--brand-emerald)' }} />
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: '13px' }}
              >
                <option value="All">All Statuses</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Pending">Pending</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F1F5F9', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
              <input 
                type="date" 
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: '13px', padding: 0 }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-outline" onClick={downloadCSV} style={{ padding: '8px 16px', fontSize: '13px' }}>
              <Download size={14} /> CSV
            </button>
            <button className="btn btn-outline" onClick={downloadPDF} style={{ padding: '8px 16px', fontSize: '13px' }}>
              <Download size={14} /> PDF
            </button>
            <button 
              className="btn btn-primary" 
              onClick={fetchBookings} 
              style={{ padding: '8px 16px', fontSize: '13px' }}
              disabled={isRefreshing}
            >
              <RefreshCw size={14} className={isRefreshing ? 'spin' : ''} /> {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

        </div>
      </div>

      <div className="glass-card">
        <h3 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>Operations Queue</h3>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading records...</div>
        ) : filteredBookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No records match your filters.</div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Ref & Priority</th>
                  <th>Trip Info</th>
                  <th>Customer</th>
                  <th>Date & Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((b) => {
                  const isPriority = b.amount > 500 || b.status === 'Pending';
                  
                  return (
                    <tr 
                      key={b.id} 
                      onClick={() => setActivePage(`detail_${b.id}`)}
                    >
                      <td style={{ cursor: 'pointer', transition: 'background 0.2s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{b.booking_ref}</span>
                          {isPriority && <AlertCircle size={14} style={{ color: '#DC2626' }} title="Priority Record" />}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{b.tour_name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Driver: {b.driver_name}</div>
                      </td>
                      <td>
                        <div>{b.customer_name || `Customer #${b.customer_id}`}</div>
                      </td>
                      <td>
                        <div>{new Date(b.trip_date).toLocaleDateString('en-IN')}</div>
                        <div style={{ fontWeight: 600, color: 'var(--brand-navy)' }}>₹{parseFloat(b.amount).toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
                      </td>
                      <td>
                        <span className={getStatusBadge(b.status)}>{b.status}</span>
                      </td>
                      <td>
                        <ArrowRight size={16} className="text-secondary" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
