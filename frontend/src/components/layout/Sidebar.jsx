import React from 'react';
import { Files, Search, GitBranch, Settings, LayoutGrid, Network } from 'lucide-react';

const Sidebar = ({ children, activeTab, setActiveTab }) => {
  return (
    <div className="sidebar-container">
      <div className="activity-bar">
        <div className="activity-top">
          <div className={`activity-icon ${activeTab === 'explorer' ? 'active' : ''}`} onClick={() => setActiveTab('explorer')} title="Explorer">
            <Files size={24} strokeWidth={1.5} />
          </div>
          <div className={`activity-icon ${activeTab === 'search' ? 'active' : ''}`} onClick={() => setActiveTab('search')} title="Search">
            <Search size={24} strokeWidth={1.5} />
          </div>
          <div className={`activity-icon ${activeTab === 'source' ? 'active' : ''}`} onClick={() => setActiveTab('source')} title="Source Control">
            <GitBranch size={24} strokeWidth={1.5} />
          </div>
          <div className={`activity-icon ${activeTab === 'graph' ? 'active' : ''}`} onClick={() => setActiveTab('graph')} title="Architecture Graph">
            <Network size={24} strokeWidth={1.5} />
          </div>
          <div className={`activity-icon ${activeTab === 'services' ? 'active' : ''}`} onClick={() => setActiveTab('services')} title="Services">
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
