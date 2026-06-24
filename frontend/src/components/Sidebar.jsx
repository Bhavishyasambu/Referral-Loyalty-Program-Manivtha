import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Home, 
  Map, 
  Users, 
  User,
  Gift, 
  Award, 
  BarChart2, 
  Settings, 
  LogOut,
  Calendar,
  Briefcase,
  Bot
} from 'lucide-react';

export default function Sidebar({ activePage, setActivePage }) {
  const { user, logout } = useAuth();

  if (!user) return null;

  const isAdmin = user.role === 'admin';

  return (
    <div className="sidebar">
      <div className="sidebar-brand">
        <Map size={24} style={{ color: '#10B981' }} />
        <span className="sidebar-logo">Travel Operations</span>
      </div>

      <nav className="sidebar-menu">
        {/* Customer & Admin Shared */}
        <div 
          className={`sidebar-item ${activePage === 'home' ? 'active' : ''}`}
          onClick={() => setActivePage('home')}
        >
          <Home size={18} />
          <span>Home Dashboard</span>
        </div>

        <div 
          className={`sidebar-item ${activePage === 'profile' ? 'active' : ''}`}
          onClick={() => setActivePage('profile')}
        >
          <User size={18} />
          <span>My Profile</span>
        </div>

        {/* Customer Only Links */}
        {!isAdmin && (
          <>
            <div 
              className={`sidebar-item ${activePage === 'bookings' ? 'active' : ''}`}
              onClick={() => setActivePage('bookings')}
            >
              <Calendar size={18} />
              <span>Book a Trip</span>
            </div>

            <div 
              className={`sidebar-item ${activePage === 'loyalty' ? 'active' : ''}`}
              onClick={() => setActivePage('loyalty')}
            >
              <Award size={18} />
              <span>Loyalty Points</span>
            </div>

            <div 
              className={`sidebar-item ${activePage === 'referrals' ? 'active' : ''}`}
              onClick={() => setActivePage('referrals')}
            >
              <Users size={18} />
              <span>Referral Program</span>
            </div>

            <div 
              className={`sidebar-item ${activePage === 'rewards' ? 'active' : ''}`}
              onClick={() => setActivePage('rewards')}
            >
              <Gift size={18} />
              <span>Rewards & Vouchers</span>
            </div>
          </>
        )}

        {/* Admin Only Links */}
        {isAdmin && (
          <>
            <div 
              className={`sidebar-item ${activePage === 'customers' ? 'active' : ''}`}
              onClick={() => setActivePage('customers')}
            >
              <User size={18} />
              <span>Customer Directory</span>
            </div>

            <div 
              className={`sidebar-item ${activePage === 'staff' ? 'active' : ''}`}
              onClick={() => setActivePage('staff')}
            >
              <Briefcase size={18} />
              <span>Staff Dashboard</span>
            </div>

            <div 
              className={`sidebar-item ${activePage === 'workflow' ? 'active' : ''}`}
              onClick={() => setActivePage('workflow')}
            >
              <Bot size={18} />
              <span>Workflow Assistant</span>
            </div>

            <div 
              className={`sidebar-item ${activePage === 'campaigns' ? 'active' : ''}`}
              onClick={() => setActivePage('campaigns')}
            >
              <Settings size={18} />
              <span>Campaign & Settings</span>
            </div>
          </>
        )}

        {/* Shared analytics (Admin sees global, Customer sees personal stats) */}
        <div 
          className={`sidebar-item ${activePage === 'analytics' ? 'active' : ''}`}
          onClick={() => setActivePage('analytics')}
        >
          <BarChart2 size={18} />
          <span>Analytics & Reports</span>
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-item sign-out" onClick={logout}>
          <LogOut size={18} />
          <span>Sign Out</span>
        </div>
      </div>
    </div>
  );
}
