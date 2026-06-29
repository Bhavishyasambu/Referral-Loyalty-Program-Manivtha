import { useState, useEffect } from 'react';
import { useAuth, API_BASE } from '../context/AuthContext';
import Header from '../components/Header';
import { Calendar, Compass, IndianRupee, MapPin, Truck, User, Tag, HelpCircle, Check, AlertCircle } from 'lucide-react';

export default function BookingHistory() {
  const { token, refreshProfile } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [tourName, setTourName] = useState('');
  const [amount, setAmount] = useState('');
  const [pickup, setPickup] = useState('');
  const [drop, setDrop] = useState('');
  const [vehicle, setVehicle] = useState('SUV');
  const [driver, setDriver] = useState('John Doe');
  const [tripDate, setTripDate] = useState('');
  const [promoCode, setPromoCode] = useState('');

  // Discount checker status states
  const [discountInfo, setDiscountInfo] = useState(null);
  const [checkerMessage, setCheckerMessage] = useState('');
  const [checkerStatus, setCheckerStatus] = useState(''); // 'success', 'error', ''

  // Message banners
  const [formMessage, setFormMessage] = useState({ text: '', type: '' });

  const drivers = ['John Doe', 'Hans Müller', 'Akira Sato', 'Carlos Ruiz', 'Fatima Al-Sayed'];
  const vehicles = ['Sedan', 'Luxury SUV', 'Minivan', 'Hatchback', 'Premium Coach'];

  const pickupCities = [
    '', 'Hyderabad', 'Warangal', 'Nizamabad', 'Khammam', 'Karimnagar', 'Ramagundam', 
    'Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Rajahmundry', 'Tirupati'
  ];

  const dropCities = [
    '', 'Bangalore', 'Chennai', 'Kochi', 'Thiruvananthapuram', 'Coimbatore', 'Madurai', 'Mysore',
    ...pickupCities.filter(c => c !== '')
  ];

  // Auto-calculate trip amount
  useEffect(() => {
    if (!pickup || !drop || !vehicle || !tripDate) {
      setAmount('');
      return;
    }

    const baseRates = {
      'Sedan': 5000,
      'Hatchback': 4000,
      'Minivan': 7000,
      'Luxury SUV': 12000,
      'Premium Coach': 20000
    };
    
    let fare = baseRates[vehicle] || 5000;

    // Pseudo-distance logic
    if (pickup === drop) {
      fare = baseRates[vehicle]; 
    } else {
      const distanceFactor = Math.abs(pickup.length - drop.length) + 1;
      fare += distanceFactor * 1500;
    }

    // Urgency logic
    const trip = new Date(tripDate);
    const today = new Date();
    const diffTime = trip - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

    if (diffDays <= 2 && diffDays >= 0) {
      fare *= 1.5; // Surge
    } else if (diffDays >= 7) {
      fare *= 0.9; // Discount
    }

    setAmount(fare.toFixed(2));
    
    // Clear promo checker if price recalculates
    setDiscountInfo(null);
    setCheckerStatus('');
    setCheckerMessage('');
  }, [pickup, drop, vehicle, tripDate]);

  useEffect(() => {
    fetchBookings();
  }, [token]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/bookings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
      }
    } catch (err) {
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkPromoEligibility = async () => {
    if (!amount || !promoCode) {
      setCheckerMessage('Please enter booking amount and promo code.');
      setCheckerStatus('error');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/rewards/check-eligibility`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount: parseFloat(amount), code: promoCode })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.isEligible) {
          setDiscountInfo(data);
          setCheckerMessage(data.message);
          setCheckerStatus('success');
        } else {
          setDiscountInfo(null);
          setCheckerMessage(data.message || 'Invalid or expired code.');
          setCheckerStatus('error');
        }
      }
    } catch (err) {
      console.error('Promo eligibility check failed:', err);
      setCheckerMessage('Error checking code eligibility.');
      setCheckerStatus('error');
    }
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setFormMessage({ text: '', type: '' });

    if (!tourName || !amount || !pickup || !drop || !tripDate) {
      setFormMessage({ text: 'Please fill in all required fields.', type: 'error' });
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tour_name: tourName,
          amount: parseFloat(amount),
          pickup_location: pickup,
          drop_location: drop,
          vehicle_type: vehicle,
          driver_name: driver,
          trip_date: tripDate,
          campaign_code: promoCode
        })
      });

      const data = await res.json();

      if (res.ok) {
        setFormMessage({ 
          text: `Booking Confirmed! Reference: ${data.bookingRef}. You earned ${data.pointsEarned} loyalty points!`, 
          type: 'success' 
        });
        
        // Reset form
        setTourName('');
        setAmount('');
        setPickup('');
        setDrop('');
        setPromoCode('');
        setDiscountInfo(null);
        setCheckerMessage('');
        setCheckerStatus('');
        
        // Refresh bookings and user profile/points
        fetchBookings();
        refreshProfile();
      } else {
        setFormMessage({ text: data.message || 'Booking failed.', type: 'error' });
      }
    } catch (err) {
      console.error('Booking submission error:', err);
      setFormMessage({ text: 'Server error processing booking.', type: 'error' });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      <Header 
        title="Book Travel & Trips" 
        subtitle="Reserve vehicles, schedule drivers, and earn loyalty points on every mile." 
      />

      <div className="dashboard-row">
        {/* Booking Form Card */}
        <div className="glass-card">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Compass style={{ color: 'var(--brand-navy)' }} size={20} />
            New Trip Reservation
          </h2>

          {formMessage.text && (
            <div 
              style={{ 
                padding: '12px 16px', 
                borderRadius: '8px', 
                marginBottom: '20px', 
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: formMessage.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                color: formMessage.type === 'success' ? '#059669' : '#DC2626',
                border: `1px solid ${formMessage.type === 'success' ? '#6EE7B7' : '#FCA5A5'}`
              }}
            >
              {formMessage.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
              {formMessage.text}
            </div>
          )}

          <form onSubmit={handleBookingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-grid">
              <div className="form-group">
                <label>Tour / Trip Name *</label>
                <input 
                  type="text" 
                  placeholder="e.g. Swiss Alps Day Trip"
                  value={tourName}
                  onChange={(e) => setTourName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Booking Amount (₹) *</label>
                <div style={{ position: 'relative' }}>
                  <IndianRupee size={16} style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-secondary)' }} />
                  <input 
                    type="number" 
                    placeholder="Auto-calculated"
                    style={{ paddingLeft: '32px', backgroundColor: 'var(--bg-slate)', cursor: 'not-allowed' }}
                    value={amount}
                    readOnly
                  />
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Fare auto-calculates based on locations, vehicle, and date.
                </span>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Pickup Location (TS & AP) *</label>
                <div style={{ position: 'relative' }}>
                  <MapPin size={16} style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-secondary)', zIndex: 1 }} />
                  <select 
                    style={{ paddingLeft: '32px', width: '100%' }}
                    value={pickup}
                    onChange={(e) => setPickup(e.target.value)}
                    required
                  >
                    {pickupCities.map((city, idx) => (
                      <option key={idx} value={city}>{city === '' ? 'Select City...' : city}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Drop Location (Southern States) *</label>
                <div style={{ position: 'relative' }}>
                  <MapPin size={16} style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-secondary)', zIndex: 1 }} />
                  <select 
                    style={{ paddingLeft: '32px', width: '100%' }}
                    value={drop}
                    onChange={(e) => setDrop(e.target.value)}
                    required
                  >
                    {dropCities.map((city, idx) => (
                      <option key={idx} value={city}>{city === '' ? 'Select City...' : city}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Vehicle Type *</label>
                <select value={vehicle} onChange={(e) => setVehicle(e.target.value)}>
                  {vehicles.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Driver Name *</label>
                <select value={driver} onChange={(e) => setDriver(e.target.value)}>
                  {drivers.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Trip Date *</label>
                <input 
                  type="date" 
                  value={tripDate}
                  onChange={(e) => setTripDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Voucher / Promo Code</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    placeholder="e.g. SUMMER2X or LOY-RED-XXXX"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                  />
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ padding: '0 16px' }}
                    onClick={checkPromoEligibility}
                  >
                    Check
                  </button>
                </div>
                {checkerMessage && (
                  <span 
                    style={{ 
                      fontSize: '12px', 
                      marginTop: '4px',
                      color: checkerStatus === 'success' ? 'var(--brand-emerald)' : '#DC2626'
                    }}
                  >
                    {checkerMessage}
                  </span>
                )}
              </div>
            </div>

            {discountInfo && (
              <div 
                style={{ 
                  backgroundColor: 'rgba(16, 185, 129, 0.1)', 
                  border: '1px solid #10B981', 
                  borderRadius: '6px', 
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  fontSize: '14px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Original Amount:</span>
                  <span style={{ textDecoration: 'line-through' }}>₹{parseFloat(amount).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--brand-emerald)', fontWeight: 600 }}>
                  <span>Discount Applied:</span>
                  <span>-₹{parseFloat(discountInfo.discountAmount).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, borderTop: '1px solid var(--border-light)', paddingTop: '6px', fontSize: '15px' }}>
                  <span>Final Payable Amount:</span>
                  <span>₹{parseFloat(discountInfo.finalAmount).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>
                {parseFloat(discountInfo.pointsMultiplier) > 1 && (
                  <div style={{ color: 'var(--brand-emerald)', fontSize: '12px', fontWeight: 600, marginTop: '4px' }}>
                    🎉 Stacking Campaign active: {discountInfo.pointsMultiplier}x Points multiplier will apply!
                  </div>
                )}
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: '8px' }}>
              Confirm & Book Reservation
            </button>
          </form>
        </div>

        {/* Right Side: Booking List Card */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar style={{ color: 'var(--brand-navy)' }} size={20} />
            My Bookings Timeline
          </h2>

          {loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>Loading bookings...</div>
          ) : bookings.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              No bookings yet. Fill out the reservation form to schedule your first trip!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flexGrow: 1, maxHeight: '520px' }}>
              {bookings.map((b) => (
                <div 
                  key={b.id} 
                  style={{ 
                    padding: '16px', 
                    borderRadius: '8px', 
                    backgroundColor: 'var(--bg-slate)', 
                    border: '1px solid var(--border-light)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>{b.tour_name}</span>
                    <span className={`status-badge ${b.status.toLowerCase()}`}>{b.status}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={12} className="text-muted" />
                      <span>From: {b.pickup_location}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={12} className="text-muted" />
                      <span>To: {b.drop_location}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Truck size={12} className="text-muted" />
                      <span>{b.vehicle_type} • {b.driver_name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={12} style={{ color: 'var(--text-muted)' }} />
                      <span>Date: {new Date(b.trip_date).toLocaleDateString('en-IN')}</span>
                    </div>
                  </div>

                  <div 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      borderTop: '1px solid var(--border-light)', 
                      paddingTop: '10px', 
                      fontSize: '13px',
                      color: 'var(--text-muted)'
                    }}
                  >
                    <span>Ref: <strong style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{b.booking_ref}</strong></span>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <span>Spent: <strong style={{ color: 'var(--text-primary)' }}>₹{parseFloat(b.amount).toLocaleString('en-IN', {minimumFractionDigits: 2})}</strong></span>
                      {b.points_earned > 0 && (
                        <span style={{ color: 'var(--brand-emerald)', fontWeight: 600 }}>+{b.points_earned} Points</span>
                      )}
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
