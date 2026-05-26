import React from 'react';
import { GitBranch, XCircle, AlertTriangle, CheckCircle2, Radio } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';

const StatusBar = () => {
  const { sandboxId } = useProject();

  const handleGoLive = () => {
    if (sandboxId) {
      window.open(`http://${sandboxId}.preview.localhost`, '_blank');
    }
  };
  return (
    <div className="statusbar-container">
      <div className="statusbar-left">
        <div className="status-item">
          <GitBranch size={14} />
          <span>main*</span>
        </div>
        <div className="status-item error">
          <XCircle size={14} />
          <span>0</span>
        </div>
        <div className="status-item warning">
          <AlertTriangle size={14} />
          <span>0</span>
        </div>
      </div>
      
      <div className="statusbar-right">
        <div 
          className="status-item go-live-btn" 
          onClick={handleGoLive}
          style={{ cursor: 'pointer', color: '#60a5fa', transition: 'color 0.2s' }}
          onMouseOver={(e) => e.currentTarget.style.color = '#93c5fd'}
          onMouseOut={(e) => e.currentTarget.style.color = '#60a5fa'}
        >
          <Radio size={14} />
          <span>Go Live</span>
        </div>
        <div className="status-item">
          <CheckCircle2 size={14} className="success-icon" />
          <span>ESLint</span>
        </div>
        <div className="status-item">
          <span>UTF-8</span>
        </div>
        <div className="status-item">
          <span>JavaScript React</span>
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
