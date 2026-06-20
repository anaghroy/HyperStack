import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useSelector((state) => state.auth);

  if (loading) {
    return (
      <div className="auth-loading-screen">
        <div className="glow-orb"></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Loader2 size={18} color="white" className="animate-spin" />
          <span className="loading-text">Initializing Workspace...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
