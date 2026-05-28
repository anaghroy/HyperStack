import React from 'react';
import { Search } from 'lucide-react';
import { useSelector } from 'react-redux';
import logo from '../assets/images/logo.png';

const Header = ({ searchQuery, setSearchQuery, showSearch = true }) => {
  const { user } = useSelector((state) => state.auth);

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
        <div className="user-profile">
          <div className="avatar-container">
            {user?.avatar ? (
              <img src={user.avatar} alt="Profile" className="avatar" />
            ) : (
              <div className="avatar-placeholder">
                {user?.avatarUrl ? (
                   <img src={user.avatarUrl} alt="avatar" />
                ) : (
                   <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'User'}`} alt="avatar" style={{width: '100%', height: '100%', borderRadius: '50%'}}/>
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
