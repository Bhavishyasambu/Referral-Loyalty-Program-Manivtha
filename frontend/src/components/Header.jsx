import React, { useState, useEffect, useRef } from 'react';
import { useAuth, API_BASE } from '../context/AuthContext';
import { Bell, User, Check, Sun, Moon, Crown, Award, Medal } from 'lucide-react';

export default function Header({ title, subtitle }) {
  const { user, customer, token, isDarkMode, toggleTheme } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Theme is strictly light/enterprise now

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/customers/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll notifications every 20 seconds
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
  }, [token]);

  const markAllAsRead = async () => {
    try {
      const res = await fetch(`${API_BASE}/customers/notifications/read`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      }
    } catch (err) {
      console.error('Error marking notifications as read:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <header className="header-bar">
      <div className="header-title">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      <div className="header-actions">
        {/* Theme Toggle */}
        <div className="theme-toggle-btn" onClick={toggleTheme} title="Toggle Theme">
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </div>

        {/* Notifications System */}
        <div className="notification-bell-container" ref={dropdownRef}>
          <div onClick={() => setShowDropdown(!showDropdown)} style={{ position: 'relative', padding: '6px' }}>
            <Bell size={20} className="text-secondary" />
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount}</span>
            )}
          </div>

          {showDropdown && (
            <div className="notifications-dropdown">
              <div className="notifications-header">
                <span style={{ fontWeight: 600, fontSize: '14px' }}>Notifications</span>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: 'var(--brand-emerald)', 
                      fontSize: '11px', 
                      fontWeight: 600, 
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Check size={12} />
                    Mark all read
                  </button>
                )}
              </div>
              
              <div className="notifications-list">
                {notifications.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                    No notifications yet.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n.id} 
                      className={`notification-item ${!n.is_read ? 'unread' : ''}`}
                    >
                      <div className="notification-item-title">{n.title}</div>
                      <div className="notification-item-message">{n.message}</div>
                      <div className="notification-item-time">
                        {new Date(n.created_at).toLocaleDateString()} at{' '}
                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Card */}
        {user && (
          <div className="user-profile-card">
            <div className="user-avatar">
              <User size={16} style={{ color: 'var(--text-secondary)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {user.role === 'admin' ? 'Admin' : (
                  <>
                    {customer?.tier === 'Gold' ? <Crown size={12} style={{ color: '#F59E0B' }} /> : 
                     customer?.tier === 'Silver' ? <Award size={12} style={{ color: '#94A3B8' }} /> : 
                     <Medal size={12} style={{ color: '#B45309' }} />}
                    {`${customer?.tier || 'Bronze'} Member`}
                  </>
                )}
              </span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
