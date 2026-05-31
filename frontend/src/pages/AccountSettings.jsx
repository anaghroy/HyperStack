import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { updatePreferences, deleteAccount } from '../redux/slices/authSlice';
import { getAuditLogsAPI } from '../services/api';
import { ArrowLeft, User, Bell, Settings as SettingsIcon, Shield, Activity, Monitor, Smartphone } from 'lucide-react';
import { FcGoogle} from 'react-icons/fc';
import { FaGithub } from 'react-icons/fa';
import toast from 'react-hot-toast';

const AccountSettings = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [auditLogs, setAuditLogs] = useState([]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await getAuditLogsAPI();
        if (data && data.logs) {
          setAuditLogs(data.logs);
        }
      } catch (error) {
        console.error("Failed to fetch audit logs", error);
      }
    };
    fetchLogs();
  }, []);

  useEffect(() => {
    if (user) {
      setTwoFactorEnabled(user.twoFactorEnabled || false);
      setEmailNotifications(user.emailNotifications ?? true);
      setWebhookUrl(user.webhookUrl || "");
    }
  }, [user]);

  const handleToggle2FA = async () => {
    const newValue = !twoFactorEnabled;
    setTwoFactorEnabled(newValue);
    try {
      const resultAction = await dispatch(updatePreferences({ twoFactorEnabled: newValue }));
      if (updatePreferences.fulfilled.match(resultAction)) {
        toast.success(newValue ? "Two-Factor Authentication enabled" : "Two-Factor Authentication disabled");
      } else {
        setTwoFactorEnabled(!newValue); // revert
        toast.error("Failed to update preference");
      }
    } catch (error) {
      setTwoFactorEnabled(!newValue);
      toast.error("An error occurred");
    }
  };

  const handleToggleEmail = async () => {
    const newValue = !emailNotifications;
    setEmailNotifications(newValue);
    try {
      const resultAction = await dispatch(updatePreferences({ emailNotifications: newValue }));
      if (updatePreferences.fulfilled.match(resultAction)) {
        toast.success(newValue ? "Email Notifications enabled" : "Email Notifications disabled");
      } else {
        setEmailNotifications(!newValue); // revert
        toast.error("Failed to update preference");
      }
    } catch (error) {
      setEmailNotifications(!newValue);
      toast.error("An error occurred");
    }
  };

  const handleSaveWebhook = async () => {
    try {
      const resultAction = await dispatch(updatePreferences({ webhookUrl }));
      if (updatePreferences.fulfilled.match(resultAction)) {
        toast.success("Webhook URL saved successfully");
      } else {
        toast.error("Failed to save Webhook URL");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm("Are you absolutely sure you want to delete your account? This action cannot be undone and will delete all your projects.");
    if (!confirmed) return;

    try {
      const resultAction = await dispatch(deleteAccount());
      if (deleteAccount.fulfilled.match(resultAction)) {
        toast.success("Account deleted successfully");
        navigate('/login');
      } else {
        toast.error(resultAction.payload || "Failed to delete account");
      }
    } catch (error) {
      toast.error("An error occurred during account deletion");
    }
  };

  return (
    <div style={{ background: 'var(--bg-color)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Header matching screenshot */}
      <div style={{ padding: '24px 40px', maxWidth: '1200px', width: '100%', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button 
          onClick={() => navigate('/')} 
          style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <ArrowLeft size={20} />
        </button>
        <h2 style={{ fontSize: '1.25rem', color: '#fff', fontWeight: '600', margin: 0 }}>Account Settings</h2>
      </div>

      <div className="account-settings-container">
        
        {/* Sidebar */}
        <aside className="settings-sidebar">
          <button className="nav-btn active">
            <User size={18} />
            <span>Profile & Security</span>
          </button>
          <button className="nav-btn">
            <Bell size={18} />
            <span>Notifications</span>
          </button>
          <button className="nav-btn">
            <SettingsIcon size={18} />
            <span>Preferences</span>
          </button>
        </aside>

        {/* Main Content */}
        <div className="settings-content">
          
          {/* Linked Accounts Card */}
          <div className="settings-card">
            <div className="card-header">
              <Shield size={20} />
              <span>Linked Accounts</span>
            </div>

            <div className="linked-account">
              <div className="account-info">
                <div className="account-icon">
                  <FaGithub size={24} color="#fff" /> 
                </div>
                <div>
                  <h4>GitHub</h4>
                  <p>Fast one-click login</p>
                </div>
              </div>
              <span className={`status-text ${user?.githubId ? 'connected' : 'connect'}`}>
                {user?.githubId ? 'Connected' : 'Connect'}
              </span>
            </div>

            <div className="linked-account">
              <div className="account-info">
                <div className="account-icon">
                  <FcGoogle size={24} />
                </div>
                <div>
                  <h4>Google</h4>
                  <p>Connected via workspace</p>
                </div>
              </div>
              <span className={`status-text ${user?.googleId ? 'connected' : 'connect'}`}>
                {user?.googleId ? 'Connected' : 'Connect'}
              </span>
            </div>
          </div>

          {/* General Preferences Card */}
          <div className="settings-card">
            <div className="card-header">
              <SettingsIcon size={20} />
              <span>General Preferences</span>
            </div>

            <div className="preference-item">
              <div className="pref-info">
                <h4>Two-Factor Authentication</h4>
                <p>Enhance your account security</p>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" checked={twoFactorEnabled} onChange={handleToggle2FA} />
                <span className="slider"></span>
              </label>
            </div>

            <div className="preference-item">
              <div className="pref-info">
                <h4>Email Notifications</h4>
                <p>Receive deployment & security alerts</p>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" checked={emailNotifications} onChange={handleToggleEmail} />
                <span className="slider"></span>
              </label>
            </div>
            <div className="preference-item">
              <div className="pref-info">
                <h4>Webhook Integration</h4>
                <p>Send alerts to Discord or Slack</p>
              </div>
              <div className="webhook-input-group">
                <input 
                  type="text" 
                  placeholder="https://discord.com/api/webhooks/..." 
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="webhook-input"
                />
                <button 
                  onClick={handleSaveWebhook}
                  className="webhook-save-btn"
                >
                  Save
                </button>
              </div>
            </div>

          </div>

          {/* Audit Logs Card */}
          <div className="settings-card">
            <div className="card-header">
              <Activity size={20} />
              <span>Recent Login Activity</span>
            </div>

            {auditLogs.length > 0 ? (
              <div className="audit-logs-list">
                {auditLogs.map((log) => {
                  const isMobile = log.userAgent && log.userAgent.toLowerCase().includes('mobile');
                  return (
                    <div key={log._id} className="audit-log-item">
                      <div className="log-icon">
                        {isMobile ? <Smartphone size={18} /> : <Monitor size={18} />}
                      </div>
                      <div className="log-details">
                        <h4>{log.provider} Login</h4>
                        <p>{log.ipAddress} • {new Date(log.createdAt).toLocaleString()}</p>
                      </div>
                      <span className={`status-text ${log.status === 'Success' ? 'connected' : 'danger'}`}>
                        {log.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: '#888', fontSize: '0.9rem' }}>No recent activity found.</p>
            )}
          </div>

          {/* Danger Zone Card */}
          <div className="settings-card danger-zone">
            <div className="card-header">
              <span>Danger Zone</span>
            </div>
            <p className="danger-text">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            <button className="delete-btn" onClick={handleDeleteAccount}>
              Delete Account
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AccountSettings;
