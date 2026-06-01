import React, { useState } from 'react';
import { Files, Search, GitBranch, Settings, LayoutGrid, Network, UserPlus } from 'lucide-react';
import { useSelector } from 'react-redux';
import ShareProjectModal from '../modals/ShareProjectModal';

const Sidebar = ({ children, activeTab, setActiveTab }) => {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const { activeProject } = useSelector((state) => state.project);

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
          <div className="activity-icon" onClick={() => setIsShareModalOpen(true)} title="Share Project">
            <UserPlus size={24} strokeWidth={1.5} />
          </div>
          <div className="activity-icon" title="Settings">
            <Settings size={24} strokeWidth={1.5} />
          </div>
        </div>
      </div>
      {children}
      <ShareProjectModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        activeProject={activeProject}
      />
    </div>
  );
};

export default Sidebar;
