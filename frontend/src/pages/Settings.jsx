import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logoutUser } from '../redux/slices/authSlice';
import { updateWebhook } from '../services/api';
import { LogOut, LayoutDashboard, Folder, Users, Settings as SettingsIcon, Loader2 } from 'lucide-react';
import Header from '../components/Header';
import toast from 'react-hot-toast';

const Settings = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const logout = () => dispatch(logoutUser());
  const navigate = useNavigate();
  const [webhookUrl, setWebhookUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user?.webhookUrl) {
      setWebhookUrl(user.webhookUrl);
    }
  }, [user]);

  const handleSaveWebhook = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateWebhook(webhookUrl);
      toast.success('Webhook saved successfully!');
    } catch (error) {
      toast.error('Failed to save webhook');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-wrapper">
      <Header searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

      <div className="dashboard-body">
        <aside className="sidebar">
          <nav className="sidebar-nav">
            <div className="nav-item" onClick={() => navigate('/')}>
              <LayoutDashboard size={18} />
              <span>Overview</span>
            </div>
            <div className="nav-item" onClick={() => navigate('/')}>
              <Folder size={18} />
              <span>My Projects</span>
            </div>
            <div className="nav-item">
              <Users size={18} />
              <span>Shared Projects</span>
            </div>
            <div className="nav-item active">
              <SettingsIcon size={18} />
              <span>Settings</span>
            </div>
          </nav>
          
          <div className="sidebar-bottom">
            <button className="logout-btn" onClick={logout} title="Log Out">
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        <main className="dashboard-content">
          <div className="content-header">
            <div className="title-section">
              <h1>Settings</h1>
              <p>Manage your account integrations and preferences.</p>
            </div>
          </div>

          <div className="settings-card" style={{ background: 'var(--surface-color)', padding: '24px', borderRadius: '12px', marginTop: '20px' }}>
            <h3>Notifications & Webhooks</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Connect a Discord or Slack webhook to receive automated alerts when your sandboxes are created or when events occur.
            </p>
            
            <form onSubmit={handleSaveWebhook}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  WEBHOOK URL
                </label>
                <input 
                  type="url" 
                  placeholder="https://discord.com/api/webhooks/..." 
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'white' }}
                />
              </div>
              <button 
                type="submit" 
                className="primary-btn" 
                disabled={saving}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {saving ? <Loader2 size={16} className="spin" /> : 'Save Webhook'}
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Settings;
