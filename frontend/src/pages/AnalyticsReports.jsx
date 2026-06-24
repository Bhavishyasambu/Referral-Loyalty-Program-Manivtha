import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE } from '../context/AuthContext';
import Header from '../components/Header';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { BarChart3, TrendingUp, IndianRupee, Award, Truck, ShieldAlert } from 'lucide-react';

export default function AnalyticsReports() {
  const { token, user } = useAuth();
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      fetchAnalytics();
    } else {
      fetchPersonalAnalytics();
    }
  }, [token]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/analytics/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAnalyticsData(data);
      }
    } catch (err) {
      console.error('Error fetching admin analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPersonalAnalytics = async () => {
    try {
      setLoading(true);
      // Construct personal analytics from booking list and loyalty history
      const bookRes = await fetch(`${API_BASE}/bookings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const loyaltyRes = await fetch(`${API_BASE}/loyalty/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (bookRes.ok && loyaltyRes.ok) {
        const bookings = await bookRes.json();
        const loyalty = await loyaltyRes.json();

        // 1. Booking History Chart data (personal spent)
        const bookingRevenue = bookings.map(b => ({
          date: new Date(b.trip_date).toLocaleDateString(),
          revenue: parseFloat(b.amount),
          points: parseInt(b.points_earned)
        })).reverse();

        // 2. Loyalty history points distributions
        const historyLogs = loyalty.history || [];
        const earned = historyLogs.filter(h => h.points > 0).reduce((sum, h) => sum + h.points, 0);
        const spent = Math.abs(historyLogs.filter(h => h.points < 0).reduce((sum, h) => sum + h.points, 0));

        const tierData = [
          { name: 'Earned Points', value: earned },
          { name: 'Spent/Redeemed', value: spent }
        ];

        // 3. Vehicle bookings distribution
        const vehicleCount = {};
        bookings.forEach(b => {
          vehicleCount[b.vehicle_type] = (vehicleCount[b.vehicle_type] || 0) + 1;
        });
        const vehicleDistribution = Object.keys(vehicleCount).map(k => ({
          name: k,
          value: vehicleCount[k]
        }));

        setAnalyticsData({
          personal: true,
          metrics: {
            totalBookings: bookings.length,
            totalSpent: loyalty.summary.totalSpent,
            pointsBalance: loyalty.summary.loyaltyPoints
          },
          charts: {
            bookingRevenue,
            tierDistribution: tierData,
            vehicleDistribution
          }
        });
      }
    } catch (err) {
      console.error('Error fetching personal analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#10B981', '#0F172A', '#D97706', '#0284C7', '#DC2626'];

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        <Header title="Analytics & Visual Reports" subtitle="Loading..." />
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>Generating charts...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      <Header 
        title={isAdmin ? "Enterprise Analytics" : "My Travel Insights"} 
        subtitle={isAdmin ? "System-wide timeseries metrics, tier divisions, and fleet statistics." : "Personal statistics of points earned, booking expenditures, and fleet preferences."} 
      />

      {/* Admin Visual Reports */}
      {isAdmin && analyticsData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Customer Growth & Booking Revenue Charts */}
          <div className="dashboard-row">
            {/* Customer growth */}
            <div className="glass-card">
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={18} style={{ color: 'var(--brand-navy)' }} />
                  Customer Registration Growth
                </h3>
              <div style={{ height: '300px', width: '100%' }}>
                {analyticsData.charts.customerGrowth.length === 0 ? (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No historical data.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analyticsData.charts.customerGrowth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRegs" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                      <XAxis dataKey="date" stroke="var(--text-secondary)" style={{ fontSize: '11px' }} />
                      <YAxis stroke="var(--text-secondary)" style={{ fontSize: '11px' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: 'var(--border-light)', color: 'var(--text-primary)', borderRadius: '8px' }} />
                      <Area type="monotone" dataKey="registrations" name="Signups" stroke="#10B981" fillOpacity={1} fill="url(#colorRegs)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Booking Revenue */}
            <div className="glass-card">
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IndianRupee size={18} style={{ color: 'var(--brand-navy)' }} />
                Trip Booking Revenue (₹)
              </h3>
              <div style={{ height: '300px', width: '100%' }}>
                {analyticsData.charts.bookingRevenue.length === 0 ? (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No historical data.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analyticsData.charts.bookingRevenue} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                      <XAxis dataKey="date" stroke="var(--text-secondary)" style={{ fontSize: '11px' }} />
                      <YAxis stroke="var(--text-secondary)" style={{ fontSize: '11px' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: 'var(--border-light)', color: 'var(--text-primary)', borderRadius: '8px' }} />
                      <Legend wrapperStyle={{ fontSize: '11px', marginTop: '10px' }} />
                      <Line type="monotone" dataKey="revenue" name="Revenue (₹)" stroke="#0F172A" strokeWidth={2} dot={{ fill: '#0F172A' }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Tier Divisions & Fleet Statistics */}
          <div className="dashboard-row">
            {/* Loyalty Tier Distribution */}
            <div className="glass-card">
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award size={18} style={{ color: 'var(--brand-navy)' }} />
                Loyalty Tiers Distribution
              </h3>
              <div style={{ height: '280px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {analyticsData.charts.tierDistribution.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)' }}>No historical data.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analyticsData.charts.tierDistribution}
                        cx="50%"
                        cy="45%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {analyticsData.charts.tierDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: 'var(--border-light)', color: 'var(--text-primary)', borderRadius: '8px' }} />
                      <Legend formatter={(value, entry) => `${value}: ${entry.payload.value}`} wrapperStyle={{ fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Vehicle Preference */}
            <div className="glass-card">
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Truck size={18} style={{ color: 'var(--brand-navy)' }} />
                Fleet Vehicle Preferences
              </h3>
              <div style={{ height: '280px', width: '100%' }}>
                {analyticsData.charts.vehicleDistribution.length === 0 ? (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No bookings yet.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.charts.vehicleDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                      <XAxis dataKey="name" stroke="var(--text-secondary)" style={{ fontSize: '11px' }} />
                      <YAxis stroke="var(--text-secondary)" style={{ fontSize: '11px' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: 'var(--border-light)', color: 'var(--text-primary)', borderRadius: '8px' }} />
                      <Bar dataKey="value" name="Bookings Count" fill="#10B981" radius={[4, 4, 0, 0]}>
                        {analyticsData.charts.vehicleDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Insights Dashboard */}
      {!isAdmin && analyticsData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Metrics summary cards */}
          <div className="stats-grid">
            <div className="glass-card stat-card">
              <div className="stat-icon-wrapper">
                <BarChart3 size={24} />
              </div>
              <div className="stat-info">
                <div className="stat-label">Trips Resourced</div>
                <div className="stat-value">{analyticsData.metrics.totalBookings}</div>
              </div>
            </div>

            <div className="glass-card stat-card">
              <div className="stat-icon-wrapper emerald">
                <IndianRupee size={24} />
              </div>
              <div className="stat-info">
                <div className="stat-label">Total Expended</div>
                <div className="stat-value">₹{analyticsData.metrics.totalSpent?.toLocaleString('en-IN')}</div>
              </div>
            </div>

            <div className="glass-card stat-card">
              <div className="stat-icon-wrapper violet">
                <Award size={24} />
              </div>
              <div className="stat-info">
                <div className="stat-label">Active Points Balance</div>
                <div className="stat-value">{analyticsData.metrics.pointsBalance} pts</div>
              </div>
            </div>
          </div>

          <div className="dashboard-row">
            {/* Expenditure History */}
            <div className="glass-card">
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IndianRupee size={18} style={{ color: 'var(--brand-navy)' }} />
                Booking Spending Logs (₹)
              </h3>
              <div style={{ height: '300px', width: '100%' }}>
                {analyticsData.charts.bookingRevenue.length === 0 ? (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No historical data. Book a trip to start.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analyticsData.charts.bookingRevenue} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSpent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0F172A" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#0F172A" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                      <XAxis dataKey="date" stroke="var(--text-secondary)" style={{ fontSize: '11px' }} />
                      <YAxis stroke="var(--text-secondary)" style={{ fontSize: '11px' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: 'var(--border-light)', color: 'var(--text-primary)', borderRadius: '8px' }} />
                      <Area type="monotone" dataKey="revenue" name="Spent (₹)" stroke="#0F172A" fillOpacity={1} fill="url(#colorSpent)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Points balance breakdown */}
            <div className="glass-card">
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award size={18} style={{ color: 'var(--brand-navy)' }} />
                Earned vs. Redeemed Points
              </h3>
              <div style={{ height: '300px', width: '100%' }}>
                {analyticsData.charts.tierDistribution.length === 0 ? (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No points activity log.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.charts.tierDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                      <XAxis dataKey="name" stroke="var(--text-secondary)" style={{ fontSize: '11px' }} />
                      <YAxis stroke="var(--text-secondary)" style={{ fontSize: '11px' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: 'var(--border-light)', color: 'var(--text-primary)', borderRadius: '8px' }} />
                      <Bar dataKey="value" name="Points Audit" fill="#10B981" radius={[4, 4, 0, 0]}>
                        {analyticsData.charts.tierDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
