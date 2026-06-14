import React from 'react';
import { GitBranch, XCircle, AlertTriangle, CheckCircle2, Radio, Loader2 } from 'lucide-react';
import { useSelector } from 'react-redux';

const StatusBar = () => {
  const { sandboxId, sandboxStatus } = useSelector((state) => state.project);

  const handleGoLive = () => {
    if (sandboxId && sandboxStatus === 'ready') {
      window.open(`http://${sandboxId}.preview.localhost`, '_blank');
    }
  };
  
  const isInstalling = sandboxStatus === 'installing';
  
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
          style={{ 
            cursor: isInstalling ? 'not-allowed' : 'pointer', 
            color: isInstalling ? '#9ca3af' : '#60a5fa', 
            transition: 'color 0.2s' 
          }}
          onMouseOver={(e) => { if (!isInstalling) e.currentTarget.style.color = '#93c5fd'; }}
          onMouseOut={(e) => { if (!isInstalling) e.currentTarget.style.color = '#60a5fa'; }}
        >
          {isInstalling ? <Loader2 size={14} className="animate-spin" /> : <Radio size={14} />}
          <span>{isInstalling ? 'Installing...' : 'Go Live'}</span>
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
