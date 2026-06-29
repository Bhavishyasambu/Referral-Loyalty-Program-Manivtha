import { useState, useEffect } from 'react';
import { useAuth, API_BASE } from '../context/AuthContext';
import Header from '../components/Header';
import { 
  Users, 
  BookOpen, 
  Share2, 
  Award, 
  Gift, 
  Calendar, 
  ArrowRight,
  TrendingUp,
  MapPin
} from 'lucide-react';

export default function HomeDashboard({ setActivePage }) {
  const { user, customer, token, refreshProfile } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [activeCampaigns, setActiveCampaigns] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    refreshProfile();
    fetchDashboardData();
  }, [token]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch Active Campaigns
      const campRes = await fetch(`${API_BASE}/campaigns`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (campRes.ok) {
        const camps = await campRes.json();
        setActiveCampaigns(camps);
      }

      // Fetch Bookings (limiting to top 5)
      const bookRes = await fetch(`${API_BASE}/bookings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (bookRes.ok) {
        const bookings = await bookRes.json();
        setRecentBookings(bookings.slice(0, 5));
      }

      if (isAdmin) {
        // Fetch Admin Analytics
        const analyticsRes = await fetch(`${API_BASE}/analytics/dashboard`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (analyticsRes.ok) {
          const data = await analyticsRes.json();
          setDashboardData(data.metrics);
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard details:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      <Header 
        title={isAdmin ? "Admin Overview" : `Welcome Back, ${user?.name}!`} 
        subtitle={isAdmin ? "Monitor loyalty system metrics and marketing campaign performance." : "Plan your next escape and track your membership achievements."} 
      />

      {/* Admin Analytics Overview */}
      {isAdmin && dashboardData && (
        <>
          <div className="stats-grid">
            <div className="glass-card stat-card">
              <div className="stat-header">
                <div className="stat-icon-wrapper">
                  <Users size={20} />
                </div>
                <div className="stat-label">Total Customers</div>
              </div>
              <div className="stat-value">{dashboardData.totalCustomers}</div>
            </div>

            <div className="glass-card stat-card">
              <div className="stat-header">
                <div className="stat-icon-wrapper violet">
                  <BookOpen size={20} />
                </div>
                <div className="stat-label">Total Bookings</div>
              </div>
              <div className="stat-value">{dashboardData.totalBookings}</div>
            </div>

            <div className="glass-card stat-card">
              <div className="stat-header">
                <div className="stat-icon-wrapper emerald">
                  <Share2 size={20} />
                </div>
                <div className="stat-label">Active Referrals</div>
              </div>
              <div className="stat-value">{dashboardData.activeReferrals}</div>
            </div>

            <div className="glass-card stat-card">
              <div className="stat-header">
                <div className="stat-icon-wrapper amber">
                  <Award size={20} />
                </div>
                <div className="stat-label">Points Issued</div>
              </div>
              <div className="stat-value">{dashboardData.pointsIssued}</div>
            </div>

            <div className="glass-card stat-card">
              <div className="stat-header">
                <div className="stat-icon-wrapper red">
                  <Gift size={20} />
                </div>
                <div className="stat-label">Rewards Redeemed</div>
              </div>
              <div className="stat-value">{dashboardData.rewardsRedeemed.toLocaleString('en-IN')}</div>
            </div>
          </div>
        </>
      )}

      {/* Customer Overview */}
      {!isAdmin && customer && (
        <div className="stats-grid">
          <div className="glass-card stat-card">
            <div className="stat-header">
              <div className="stat-icon-wrapper emerald">
                <Award size={20} />
              </div>
              <div className="stat-label">Loyalty Tier</div>
            </div>
            <div className="stat-value" style={{ color: 'var(--brand-emerald)' }}>{customer.tier}</div>
          </div>

          <div className="glass-card stat-card">
            <div className="stat-header">
              <div className="stat-icon-wrapper violet">
                <TrendingUp size={20} />
              </div>
              <div className="stat-label">Available Points</div>
            </div>
            <div className="stat-value">{customer.loyalty_points} pts</div>
          </div>

          <div className="glass-card stat-card">
            <div className="stat-header">
              <div className="stat-icon-wrapper">
                <BookOpen size={20} />
              </div>
              <div className="stat-label">Total Traveled</div>
            </div>
            <div className="stat-value">₹{parseFloat(customer.total_spent || 0).toLocaleString('en-IN')}</div>
          </div>

          <div className="glass-card stat-card">
            <div className="stat-header">
              <div className="stat-icon-wrapper amber">
                <Share2 size={20} />
              </div>
              <div className="stat-label">Referral Code</div>
            </div>
            <div className="stat-value" style={{ fontFamily: 'monospace' }}>{customer.referral_code}</div>
          </div>
        </div>
      )}

      <div className="dashboard-row">
        {/* Left Side: Recent Bookings */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600 }}>Recent Bookings</h2>
            {!isAdmin && (
              <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => setActivePage('bookings')}>
                New Booking
              </button>
            )}
          </div>

          {recentBookings.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              No bookings recorded yet.
            </div>
          ) : (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Ref</th>
                    {isAdmin && <th>Customer</th>}
                    <th>Tour Name</th>
                    <th>Trip Date</th>
                    <th className="text-right">Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.map((b) => (
                    <tr key={b.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{b.booking_ref}</td>
                      {isAdmin && (
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 500 }}>{b.customer_name}</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{b.customer_email}</span>
                          </div>
                        </td>
                      )}
                      <td>{b.tour_name}</td>
                      <td>{new Date(b.trip_date).toLocaleDateString('en-IN')}</td>
                      <td className="text-right" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>₹{parseFloat(b.amount).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                      <td>
                        <span className={`status-badge ${b.status.toLowerCase()}`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Side: Active Campaigns */}
        <div className="glass-card">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>Active Campaigns</h2>
          {activeCampaigns.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              No active marketing campaigns.
            </div>
          ) : (
            <div className="campaigns-grid">
              {activeCampaigns.map((c) => (
                <div key={c.id} className="campaign-card">
                  <div className="campaign-badge">
                    {c.code}
                  </div>
                  <div className="campaign-title">
                    <Gift size={20} style={{ color: 'var(--brand-emerald)' }} />
                    {c.name}
                  </div>
                  <p className="campaign-desc">{c.description}</p>
                  <div className="campaign-chips">
                    {parseFloat(c.points_multiplier) > 1 && (
                      <span className="chip highlight">{c.points_multiplier}x Points</span>
                    )}
                    {parseFloat(c.discount_percent) > 0 && (
                      <span className="chip">{c.discount_percent}% Off</span>
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
