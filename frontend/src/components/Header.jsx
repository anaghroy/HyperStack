import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell } from 'lucide-react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/images/logo.png';
import { getNotificationsAPI, markNotificationsReadAPI } from '../services/api';


const Header = ({ searchQuery, setSearchQuery, showSearch = true }) => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = notifications.filter(n => !n.isRead).length;
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    
    // Initial fetch
    getNotificationsAPI().then(data => {
      if (data && data.notifications) {
        setNotifications(data.notifications);
      }
    }).catch(console.error);

    // Listen to real-time events from SocketListener
    const handleNewNotification = (e) => {
      const newNotif = {
        _id: Math.random().toString(36).substr(2, 9), // temp id
        message: e.detail.message,
        type: "SYSTEM",
        isRead: false,
        createdAt: e.detail.timestamp || new Date().toISOString()
      };
      setNotifications(prev => [newNotif, ...prev]);
    };

    window.addEventListener('new_notification', handleNewNotification);
    return () => window.removeEventListener('new_notification', handleNewNotification);
  }, [user]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggleNotifications = async () => {
    const newShow = !showNotifications;
    setShowNotifications(newShow);
    if (newShow && unreadCount > 0) {
      try {
        await markNotificationsReadAPI();
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      } catch (err) {
        console.error("Failed to mark notifications read", err);
      }
    }
  };

  return (
    <header className="topbar">
      <div className="logo-section">
        <img src={logo} alt="HyperStack" className="logo-icon" />
        <h2>HyperStack</h2>
      </div>
      
      {showSearch && (
        <div className="search-bar">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search projects or debug queries..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
          />
        </div>
      )}

      <div className="user-section">
        
        {/* Notification Bell */}
        <div className="notification-wrapper" ref={dropdownRef}>
          <button 
            onClick={handleToggleNotifications}
            className="notification-btn"
          >
            <Bell size={20} color={unreadCount > 0 ? '#fff' : 'rgba(255,255,255,0.6)'} />
            {unreadCount > 0 && (
              <span className="badge">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="notification-dropdown">
              <div className="dropdown-header">
                <h3>Notifications</h3>
              </div>
              <div className="dropdown-content">
                {notifications.length === 0 ? (
                  <div className="empty-state">
                    No notifications yet
                  </div>
                ) : (
                  notifications.map(notif => (
                    <div key={notif._id} className={`notif-item ${notif.isRead ? '' : 'unread'}`}>
                      <p className={notif.isRead ? 'read-text' : 'unread-text'}>{notif.message}</p>
                      <span className="notif-time">
                        {new Date(notif.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="user-profile" onClick={() => navigate('/profile')}>
          <div className="avatar-container">
            {user?.avatar ? (
              <img src={user.avatar} alt="Profile" className="avatar" />
            ) : (
              <div className="avatar-placeholder">
                {user?.avatarUrl ? (
                   <img src={user.avatarUrl} alt="avatar" />
                ) : (
                   <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'User'}`} alt="avatar" />
                )}
              </div>
            )}
            <div className="status-dot online"></div>
          </div>
          <span className="user-name">{user?.name || 'Developer'}</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
