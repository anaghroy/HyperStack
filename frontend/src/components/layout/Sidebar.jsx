import React, { useState } from 'react';
import { Files, Search, GitBranch, Settings, LayoutGrid } from 'lucide-react';

const Sidebar = ({ children }) => {
  const [activeTab, setActiveTab] = useState('explorer');

  return (
    <div className="sidebar-container">
      <div className="activity-bar">
        <div className="activity-top">
          <div className={`activity-icon ${activeTab === 'explorer' ? 'active' : ''}`} onClick={() => setActiveTab('explorer')}>
            <Files size={24} strokeWidth={1.5} />
          </div>
          <div className={`activity-icon ${activeTab === 'search' ? 'active' : ''}`} onClick={() => setActiveTab('search')}>
            <Search size={24} strokeWidth={1.5} />
          </div>
          <div className={`activity-icon ${activeTab === 'source' ? 'active' : ''}`} onClick={() => setActiveTab('source')}>
            <GitBranch size={24} strokeWidth={1.5} />
          </div>
          <div className={`activity-icon ${activeTab === 'services' ? 'active' : ''}`} onClick={() => setActiveTab('services')}>
            <LayoutGrid size={24} strokeWidth={1.5} />
          </div>
        </div>
        <div className="activity-bottom">
          <div className="activity-icon">
            <Settings size={24} strokeWidth={1.5} />
          </div>
        </div>
      </div>
      {children}
    </div>
  );
};

export default Sidebar;
