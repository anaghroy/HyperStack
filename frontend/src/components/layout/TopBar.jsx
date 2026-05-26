import React from 'react';
import { Search, Sparkles, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/images/logo.png';

const TopBar = ({ toggleAIChat }) => {
  const navigate = useNavigate();
  return (
    <div className="topbar-container">
      <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <img src={logo} alt="HyperStack Logo" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
        <span className="brand-logo">HyperStack</span>
      </div>
      
      <div className="topbar-center">
        <div className="command-palette">
          <Search size={16} className="cmd-icon" />
          <input type="text" placeholder="Search files, commands, or microservices..." />
          <span className="cmd-shortcut">⌘ K</span>
        </div>
      </div>
      
      <div className="topbar-right">
        <div 
          className="service-status" 
          onClick={() => navigate('/')}
          style={{ cursor: 'pointer', transition: 'color 0.2s' }}
          onMouseOver={(e) => e.currentTarget.style.color = '#e2e8f0'}
          onMouseOut={(e) => e.currentTarget.style.color = 'inherit'}
        >
          <ArrowLeft size={16} />
          <span>Back to Projects</span>
        </div>
        <div className="service-status ai-toggle" onClick={toggleAIChat} style={{ marginLeft: '12px' }}>
          <Sparkles size={16} color="var(--color-primary)" />
          <span>AI Chat</span>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
