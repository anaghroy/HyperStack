import React from 'react';
import { Play, Loader2, LogOut } from 'lucide-react';
import '../styles/pages/_dashboard.scss'; // Assuming styles are here

const SharedProjectCard = ({ project, startingProjectId, onOpen, onLeave }) => {
  const isStarting = startingProjectId === project._id;
  const owner = project.user; // populated owner object
  const currentUserRole = project.collaborators?.find(c => c.user === localStorage.getItem('userId'))?.role || 'Viewer';

  const formatDate = (dateString) => {
    const date = new Date(dateString || Date.now());
    const month = date.toLocaleString('default', { month: 'short' }).toUpperCase();
    const time = date.toLocaleString('default', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${month}, ${time}`;
  };

  return (
    <div className="project-card shared-project-card" onClick={() => onOpen(project)}>
      <div className="card-header">
        <h3 className="project-title">{project.title}</h3>
        <div className="badges">
          <span className="role-badge">{currentUserRole}</span>
        </div>
      </div>
      
      {project.description && (
        <p className="project-desc">{project.description}</p>
      )}

      <div className="card-footer">
        <div className="project-meta">
          <span className="updated-at">Shared with you</span>
          <div className="owner-badge" title={`Owner: ${owner?.name || owner?.email}`}>
            {owner?.avatarUrl ? (
              <img src={owner.avatarUrl} alt="owner" className="owner-avatar" />
            ) : (
              <div className="owner-avatar-placeholder">
                {(owner?.name || owner?.email || 'U')[0].toUpperCase()}
              </div>
            )}
            <span className="owner-name">{owner?.name || owner?.email?.split('@')[0]}</span>
          </div>
        </div>
        
        <div className="card-actions">
          <button 
            className="action-btn leave-btn" 
            title="Leave Project"
            onClick={(e) => {
              e.stopPropagation();
              onLeave(project._id);
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Hover Overlay */}
      <div className="card-hover-overlay">
        {isStarting ? (
          <div className="starting-indicator">
            <Loader2 className="spinner" size={32} />
            <span>Booting Sandbox...</span>
          </div>
        ) : (
          <div className="play-button">
            <Play size={32} fill="currentColor" />
          </div>
        )}
      </div>
    </div>
  );
};

export default SharedProjectCard;
