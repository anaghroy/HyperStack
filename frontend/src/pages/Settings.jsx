import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logoutUser, updateUserProfile } from '../redux/slices/authSlice';
import { LogOut, LayoutDashboard, Folder, Users, Settings as SettingsIcon, Loader2, Edit, Camera, ShieldCheck, Calendar, MapPin, Map, Mail, User as UserIcon, ArrowLeft } from 'lucide-react';
import Header from '../components/Header';
import toast from 'react-hot-toast';

const Settings = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [city, setCity] = useState('');
  const [dob, setDob] = useState('');
  const [bio, setBio] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setLocation(user.location || '');
      setCity(user.city || '');
      setDob(user.dob ? new Date(user.dob).toISOString().split('T')[0] : '');
      setBio(user.bio || '');
      setWebhookUrl(user.webhookUrl || '');
      setAvatarPreview(user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=random`);
    }
  }, [user]);

  const handleLogout = () => dispatch(logoutUser());

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (bio.length > 200) {
      toast.error("Bio must be at most 200 characters long");
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('location', location);
      formData.append('city', city);
      formData.append('dob', dob);
      formData.append('bio', bio);
      formData.append('webhookUrl', webhookUrl);
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }

      const resultAction = await dispatch(updateUserProfile(formData));
      
      if (updateUserProfile.fulfilled.match(resultAction)) {
        toast.success("Profile updated successfully!");
        setIsEditing(false);
      } else {
        toast.error(resultAction.payload || "Failed to update profile");
      }
    } catch (error) {
      toast.error("An error occurred");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
            <button className="logout-btn" onClick={handleLogout} title="Log Out">
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        <main className="dashboard-content">
          <div style={{ padding: '24px 40px 0', maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button 
              onClick={() => navigate('/')} 
              style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '8px 16px', borderRadius: '8px', gap: '8px', transition: 'all 0.2s' }}
            >
              <ArrowLeft size={18} />
              <span>Back to Dashboard</span>
            </button>
          </div>
          <div className="settings-container">
            
            {/* Left Column: Profile Summary */}
            <div className="profile-summary">
              <div className="avatar-wrapper">
                <img src={avatarPreview} alt="Avatar" />
                {isEditing && (
                  <div className="edit-avatar-btn" onClick={() => fileInputRef.current.click()}>
                    <Camera size={16} />
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </div>

              <h2 className="profile-name">{user?.name}</h2>
              <p className="profile-email">{user?.email}</p>

              <div className="profile-badges">
                <div className="badge-verified">
                  <ShieldCheck size={18} />
                  <span>Verified Account</span>
                </div>
                <div className="badge-joined">
                  <Calendar size={18} />
                  <span>Joined {formatDate(user?.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* Right Column: Personal Information Form */}
            <div className="profile-details">
              <div className="section-header">
                <div>
                  <h3>Personal Information</h3>
                  <p>Manage your public profile and account details.</p>
                </div>
                {!isEditing ? (
                  <button className="edit-btn" onClick={() => setIsEditing(true)}>
                    <Edit size={16} />
                    <span>Edit</span>
                  </button>
                ) : (
                  <div className="action-buttons">
                    <button className="cancel-btn" onClick={() => setIsEditing(false)}>
                      Cancel
                    </button>
                    <button className="save-btn" onClick={handleSave} disabled={saving}>
                      {saving ? <Loader2 size={16} className="spin" /> : 'Save Changes'}
                    </button>
                  </div>
                )}
              </div>

              <div className="form-grid">
                {/* Display Name */}
                <div className="form-group">
                  <label>Display Name</label>
                  <div className="input-wrapper">
                    <UserIcon size={18} className="input-icon" />
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div className="form-group">
                  <label>Email Address</label>
                  <div className="input-wrapper">
                    <Mail size={18} className="input-icon" />
                    <input 
                      type="email" 
                      value={user?.email || ''}
                      disabled
                    />
                  </div>
                </div>

                {/* Location */}
                <div className="form-group">
                  <label>Location</label>
                  <div className="input-wrapper">
                    <Map size={18} className="input-icon" />
                    <input 
                      type="text" 
                      placeholder="e.g. Assam"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                {/* City */}
                <div className="form-group">
                  <label>City</label>
                  <div className="input-wrapper">
                    <MapPin size={18} className="input-icon" />
                    <input 
                      type="text" 
                      placeholder="e.g. DIGBOI"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                {/* Date of Birth */}
                <div className="form-group">
                  <label>Date of Birth</label>
                  <div className="input-wrapper">
                    <Calendar size={18} className="input-icon" />
                    <input 
                      type="date" 
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                {/* Webhook URL */}
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Webhook URL (Optional)</label>
                  <div className="input-wrapper">
                    <input 
                      type="url" 
                      placeholder="https://hooks.slack.com/services/..."
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      disabled={!isEditing}
                      style={{ paddingLeft: '16px' }}
                    />
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div className="form-group">
                <div className="bio-header">
                  <label>Bio</label>
                  {isEditing && (
                    <span className={`bio-counter ${bio.length > 200 ? 'error' : ''}`}>
                      {bio.length}/200
                    </span>
                  )}
                </div>
                <textarea 
                  placeholder="Tell us about yourself..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  disabled={!isEditing}
                  rows={4}
                  className={bio.length > 200 ? 'error' : ''}
                />
                {bio.length > 200 && (
                  <span className="error-msg">Bio cannot exceed 200 characters.</span>
                )}
              </div>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Settings;
