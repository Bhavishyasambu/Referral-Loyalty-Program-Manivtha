import { useState, useEffect } from 'react';
import Header from '../components/Header';
import { useAuth, API_BASE } from '../context/AuthContext';
import { ArrowLeft, User, MapPin, Calendar, CreditCard, Send, FileText } from 'lucide-react';

export default function BookingDetail({ setActivePage, bookingId }) {
  const { token, user } = useAuth();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  useEffect(() => {
    fetchBookingDetail();
  }, [bookingId]);

  const fetchBookingDetail = async () => {
    try {
      const res = await fetch(`${API_BASE}/bookings/${bookingId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBooking(data);
      } else {
        setBooking(null);
      }
    } catch (err) {
      console.error('Failed to fetch booking detail:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setSubmittingNote(true);

    try {
      const res = await fetch(`${API_BASE}/bookings/${bookingId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ note_text: newNote })
      });
      if (res.ok) {
        setNewNote('');
        fetchBookingDetail(); // refresh data
      }
    } catch (err) {
      console.error('Failed to add note:', err);
    } finally {
      setSubmittingNote(false);
    }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--brand-emerald)' }}>Loading details...</div>;
  if (!booking) return <div style={{ padding: '40px', textAlign: 'center', color: '#DC2626' }}>Booking not found or access denied.</div>;

  return (
    <>
      <Header title={`Booking Record: ${booking.booking_ref}`} subtitle={`Complete operational details and timeline.`} />

      <button 
        className="btn btn-secondary" 
        onClick={() => setActivePage('staff')} 
        style={{ marginBottom: '24px' }}
      >
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      <div className="dashboard-row">
        {/* Left Column - Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="glass-card">
            <h3 style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
              <MapPin size={18} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '8px', color: 'var(--brand-emerald)' }} />
              Trip Details
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Tour Name</div>
                <div style={{ fontWeight: 600 }}>{booking.tour_name}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Status</div>
                <div style={{ fontWeight: 600, color: 'var(--brand-emerald)' }}>{booking.status}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Pickup Location</div>
                <div>{booking.pickup_location}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Drop Location</div>
                <div>{booking.drop_location}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Vehicle & Driver</div>
                <div>{booking.vehicle_type} - {booking.driver_name}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Trip Date</div>
                <div>{booking.trip_date}</div>
              </div>
            </div>
          </div>

          <div className="glass-card">
            <h3 style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
              <User size={18} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '8px', color: 'var(--brand-navy)' }} />
              Customer Information
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Name</div>
                <div style={{ fontWeight: 600 }}>{booking.customer_name}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Contact</div>
                <div>{booking.customer_email}<br/>{booking.phone}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Loyalty Status</div>
                <div>{booking.customer_tier} Tier ({booking.loyalty_points} Points)</div>
              </div>
            </div>
          </div>

          <div className="glass-card">
            <h3 style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
              <CreditCard size={18} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '8px', color: 'var(--brand-emerald)' }} />
              Payment & Campaigns
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total Amount</div>
                <div style={{ fontWeight: 600, fontSize: '18px' }}>₹{parseFloat(booking.amount).toLocaleString('en-IN')}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Points Earned</div>
                <div style={{ fontWeight: 600, color: 'var(--brand-emerald)' }}>+{booking.points_earned} Pts</div>
              </div>
              {booking.campaign_name && (
                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Applied Campaign</div>
                  <div>{booking.campaign_name} ({booking.campaign_code})</div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column - Notes & Workflow */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="glass-card" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
              <FileText size={18} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '8px', color: '#D97706' }} />
              Operational Notes
            </h3>
            
            <div style={{ flexGrow: 1, overflowY: 'auto', maxHeight: '400px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              {booking.notes && booking.notes.length > 0 ? (
                booking.notes.map(note => (
                  <div key={note.id} style={{ backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '8px', borderLeft: '3px solid var(--brand-emerald)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 600 }}>{note.author_name}</span>
                      <span>{new Date(note.created_at).toLocaleString('en-IN')}</span>
                    </div>
                    <div style={{ fontSize: '14px', lineHeight: 1.4 }}>{note.note_text}</div>
                  </div>
                ))
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', marginTop: '20px' }}>No operational notes yet.</div>
              )}
            </div>

            <form onSubmit={handleAddNote} style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                placeholder="Add an internal note..." 
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                style={{ flexGrow: 1 }}
              />
              <button type="submit" className="btn btn-primary" disabled={submittingNote || !newNote.trim()}>
                <Send size={16} />
              </button>
            </form>
          </div>

        </div>
      </div>
    </>
  );
}
