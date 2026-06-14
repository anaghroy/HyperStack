import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logoutUser } from '../redux/slices/authSlice';
import { setActiveProject, setSandboxId } from '../redux/slices/projectSlice';
import { listProjects, createProject, startSandbox, deleteProject, updateProject, getSharedProjectsAPI, leaveProjectAPI } from '../services/api';
import { Plus, Folder, Loader2, Search, LogOut, Trash2, LayoutDashboard, Users, Settings, Rocket, Link as LinkIcon, Edit2, ExternalLink, X } from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';
import Header from '../components/Header';
import SharedProjectCard from '../components/SharedProjectCard';
import Overview from './Overview';

const Dashboard = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  
  const logout = () => {
    dispatch(logoutUser());
  };
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [sharedProjects, setSharedProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startingProjectId, setStartingProjectId] = useState(null);
  const [viewMode, setViewMode] = useState('overview'); // 'overview', 'owned' or 'shared'
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  
  // Create project modal state
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectGithub, setNewProjectGithub] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');

  // Edit project modal state
  const [editingProject, setEditingProject] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  useEffect(() => {
    if (viewMode === 'owned') {
      fetchProjects();
    } else {
      fetchSharedProjects();
    }
  }, [viewMode]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await listProjects();
      if (data && data.projects) {
        setProjects(data.projects);
      }
    } catch (error) {
      console.error("Failed to load projects", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSharedProjects = async () => {
    try {
      setLoading(true);
      const data = await getSharedProjectsAPI();
      if (data && data.projects) {
        setSharedProjects(data.projects);
      }
    } catch (error) {
      console.error("Failed to load shared projects", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectTitle.trim() && !newProjectGithub.trim()) return;

    let finalTitle = newProjectTitle.trim();
    if (!finalTitle && newProjectGithub.trim()) {
      try {
        const urlObj = new URL(newProjectGithub);
        const paths = urlObj.pathname.split('/').filter(Boolean);
        finalTitle = paths[paths.length - 1]?.replace('.git', '') || 'Imported Project';
      } catch (err) {
        finalTitle = 'Imported Project';
      }
    }

    try {
      setLoading(true);
      const data = await createProject(finalTitle, newProjectGithub.trim());
      if (data && data.project) {
        setProjects([...projects, data.project]);
        setNewProjectTitle('');
        setNewProjectGithub('');
        setNewProjectDescription('');
        setIsCreating(false);
      }
    } catch (error) {
      console.error("Failed to create project", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenProject = async (project) => {
    try {
      setStartingProjectId(project._id);
      const data = await startSandbox(project._id);
      
      if (data && data.sandboxId) {
        dispatch(setActiveProject(project));
        dispatch(setSandboxId(data.sandboxId));
        navigate('/ide');
      }
    } catch (error) {
      console.error("Failed to start sandbox", error);
      setStartingProjectId(null);
    }
  };

  const handleDeleteProject = async (e, projectId) => {
    e.stopPropagation(); // Prevent opening the project
    if (!window.confirm("Are you sure you want to delete this project? This action cannot be undone.")) return;
    
    try {
      await deleteProject(projectId);
      setProjects(projects.filter(p => p._id !== projectId));
      if (startingProjectId === projectId) setStartingProjectId(null);
    } catch (error) {
      console.error("Failed to delete project:", error);
      alert("Failed to delete project. Please try again.");
    }
  };

  const handleLeaveProject = async (projectId) => {
    if (!window.confirm("Are you sure you want to leave this project?")) return;
    try {
      await leaveProjectAPI(projectId);
      setSharedProjects(sharedProjects.filter(p => p._id !== projectId));
    } catch (error) {
      console.error("Failed to leave project:", error);
      alert("Failed to leave project.");
    }
  };

  const handleEditClick = (e, project) => {
    e.stopPropagation();
    setEditingProject(project);
    setEditTitle(project.title);
    setEditDescription(project.description || '');
  };

  const handleUpdateProject = async (e) => {
    e.preventDefault();
    if (!editTitle.trim()) return;

    try {
      // Opt to use a local flag or just prevent multiple submits
      const data = await updateProject(editingProject._id, { title: editTitle, description: editDescription });
      
      const updatedProject = data?.project || { ...editingProject, title: editTitle, description: editDescription };
      
      setProjects(projects.map(p => p._id === editingProject._id ? updatedProject : p));
      setEditingProject(null);
    } catch (error) {
      console.error("Failed to update project", error);
      // Fallback optimistic update if API is just mocked or not ready yet
      const updatedProject = { ...editingProject, title: editTitle, description: editDescription };
      setProjects(projects.map(p => p._id === editingProject._id ? updatedProject : p));
      setEditingProject(null);
    }
  };

  const currentList = viewMode === 'owned' ? projects : sharedProjects;
  const filteredProjects = currentList.filter(project => 
    project.title.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  const formatDate = (id) => {
    const timestamp = id ? parseInt(id.substring(0, 8), 16) * 1000 : Date.now();
    const date = new Date(timestamp);
    const month = date.toLocaleString('default', { month: 'short' }).toUpperCase();
    const time = date.toLocaleString('default', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${month}, ${time}`;
  };

  const getGithubRepoName = (url) => {
    if (!url) return '';
    try {
      return url.split('github.com/')[1] || url;
    } catch {
      return url;
    }
  };

  return (
    <div className="dashboard-wrapper">
      <Header 
        searchQuery={searchQuery} 
        setSearchQuery={setSearchQuery} 
        showSearch={true} 
      />

      <div className="dashboard-body">
        <aside className="sidebar">
          <nav className="sidebar-nav">
          <div className={`nav-item ${viewMode === 'overview' ? 'active' : ''}`} onClick={() => setViewMode('overview')}>
            <LayoutDashboard size={18} />
            <span>Overview</span>
          </div>
          <div className={`nav-item ${viewMode === 'owned' ? 'active' : ''}`} onClick={() => setViewMode('owned')}>
            <Folder size={18} />
            <span>My Projects</span>
          </div>
          <div className={`nav-item ${viewMode === 'shared' ? 'active' : ''}`} onClick={() => setViewMode('shared')}>
            <Users size={18} />
            <span>Shared Projects</span>
          </div>
          <div className="nav-item" onClick={() => navigate('/settings')}>
            <Settings size={18} />
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
          {viewMode === 'overview' ? (
            <Overview />
          ) : (
            <>
              <div className="content-header">
                <div className="title-section">
                  <h1>{viewMode === 'owned' ? 'My Projects' : 'Shared With Me'}</h1>
                  <p>{viewMode === 'owned' ? 'Manage and organize your AI code projects.' : 'Projects you are collaborating on.'}</p>
                </div>
                {viewMode === 'owned' && (
                  <div className="header-actions">
                    <button className="secondary-btn" onClick={() => navigate('/connect-repo')}>
                      <LinkIcon size={16} />
                      <span>Connect Repo</span>
                    </button>
                    <button className="primary-btn" onClick={() => setIsCreating(true)}>
                      <Plus size={18} />
                      <span>Create New Project</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="projects-grid">
                {loading && !isCreating && currentList.length === 0 ? (
                  <div className="loading-state">
                    <Loader2 size={32} className="spin" />
                  </div>
                ) : currentList.length === 0 ? (
                  <div className="empty-state">
                    {viewMode === 'owned' ? (
                      <>
                        <Folder size={48} />
                        <h3>No projects yet</h3>
                        <p>Create your first project to get started.</p>
                        <button className="primary-btn mt-4" onClick={() => setIsCreating(true)}>
                          Create Project
                        </button>
                      </>
                    ) : (
                      <>
                        <Users size={48} />
                        <h3>No shared projects</h3>
                        <p>When someone shares a project with you, it will appear here.</p>
                      </>
                    )}
                  </div>
                ) : filteredProjects.length === 0 ? (
                  <div className="empty-state" style={{ gridColumn: '1 / -1', padding: '40px' }}>
                    <Search size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
                <h3>No matching projects found</h3>
                <p>We couldn't find any projects matching "{searchQuery}"</p>
              </div>
            ) : (
              filteredProjects.map((project) => (
                viewMode === 'shared' ? (
                  <SharedProjectCard 
                    key={project._id}
                    project={project}
                    startingProjectId={startingProjectId}
                    onOpen={handleOpenProject}
                    onLeave={handleLeaveProject}
                  />
                ) : (
                <div 
                  key={project._id} 
                  className={`project-card ${startingProjectId === project._id ? 'starting' : ''}`}
                  onClick={() => handleOpenProject(project)}
                >
                  {startingProjectId === project._id ? (
                    <div className="card-loading-overlay">
                      <Loader2 size={24} className="spin" />
                      <span>Starting Sandbox...</span>
                    </div>
                  ) : (
                    <>
                      <div className="card-top">
                        <h3>{project.title}</h3>
                        <span className="card-date">{formatDate(project._id)}</span>
                      </div>
                      <div className="card-desc">
                        {project.description ? project.description : (project.githubUrl ? `Connected github repository:\n${getGithubRepoName(project.githubUrl)}` : 'No description provided.')}
                      </div>
                      <div className="card-bottom">
                        <div className="card-actions">
                          <button className="icon-btn edit-btn" onClick={(e) => handleEditClick(e, project)}><Edit2 size={16} /></button>
                          <button className="icon-btn delete-btn" onClick={(e) => handleDeleteProject(e, project._id)}><Trash2 size={16} /></button>
                          <button className="icon-btn" onClick={(e) => { e.stopPropagation(); project.githubUrl && window.open(project.githubUrl, '_blank'); }}><ExternalLink size={16} /></button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                )
              ))
            )}
          </div>
          </>
        )}
        </main>
      </div>

      {editingProject && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Edit Project</h3>
              <button className="close-btn" onClick={() => setEditingProject(null)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdateProject}>
              <div className="form-group">
                <label>PROJECT NAME</label>
                <input 
                  type="text" 
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>DESCRIPTION (OPTIONAL)</label>
                <textarea 
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="An AI-powered application that gives the power to access..."
                  rows={4}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="cancel-btn" onClick={() => setEditingProject(null)}>Cancel</button>
                <button type="submit" className="save-btn" disabled={!editTitle.trim()}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCreating && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Create Project</h3>
              <button className="close-btn" onClick={() => setIsCreating(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateProject}>
              <div className="form-group">
                <label>PROJECT NAME</label>
                <input 
                  type="text" 
                  value={newProjectTitle}
                  onChange={(e) => setNewProjectTitle(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>DESCRIPTION (OPTIONAL)</label>
                <textarea 
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  placeholder="An AI-powered application that gives the power to access..."
                  rows={4}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="cancel-btn" onClick={() => setIsCreating(false)}>Cancel</button>
                <button type="submit" className="save-btn" disabled={(!newProjectTitle.trim() && !newProjectGithub.trim()) || loading}>
                  {loading ? <Loader2 size={16} className="spin" /> : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

