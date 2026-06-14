import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Loader2, ArrowLeft, Search, Link as LinkIcon, Plus, Terminal, Play, Hash, ChevronDown, ChevronUp } from 'lucide-react';
import { ShieldCheck } from 'lucide-react';
import { FaGithub } from "react-icons/fa";
import { SiGitlab } from "react-icons/si";
import { IoLogoBitbucket } from "react-icons/io";
import { getGithubReposAPI, createProject, startSandbox } from '../services/api';
import { setActiveProject, setSandboxId, setSandboxStatus } from '../redux/slices/projectSlice';
import Header from '../components/Header';
// import '../styles/pages/_connectRepo.scss';

const ConnectRepo = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  
  const [repos, setRepos] = useState([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [manualUrl, setManualUrl] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  
  const [connecting, setConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [installCmd, setInstallCmd] = useState('');
  const [startCmd, setStartCmd] = useState('');
  const [port, setPort] = useState(5173);

  // Check if user is logged in via GitHub (we look for githubId)
  const isGithubUser = !!user?.githubId;

  useEffect(() => {
    if (isGithubUser) {
      fetchRepos();
    }
  }, [isGithubUser]);

  const fetchRepos = async () => {
    setLoadingRepos(true);
    setErrorMsg('');
    try {
      const data = await getGithubReposAPI();
      if (data && data.repos) {
        setRepos(data.repos);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to load GitHub repositories. Make sure you connected your GitHub account.");
    } finally {
      setLoadingRepos(false);
    }
  };

  const handleConnectRepo = async (repoUrl, titleStr) => {
    if (!repoUrl) return;
    setConnecting(true);
    setErrorMsg('');
    
    let finalTitle = titleStr;
    if (!finalTitle) {
      try {
        const urlObj = new URL(repoUrl);
        const paths = urlObj.pathname.split('/').filter(Boolean);
        finalTitle = paths[paths.length - 1]?.replace('.git', '') || 'Imported Project';
      } catch (err) {
        finalTitle = 'Imported Project';
      }
    }

    try {
      // Create project in DB
      const data = await createProject(finalTitle, repoUrl, installCmd, startCmd, port);
      if (data && data.project) {
        // Start Sandbox immediately
        dispatch(setSandboxStatus('creating'));
        const startData = await startSandbox(data.project._id);
        if (startData && startData.sandboxId) {
          dispatch(setActiveProject(data.project));
          dispatch(setSandboxId(startData.sandboxId));
          dispatch(setSandboxStatus('installing'));
          navigate('/ide');
        } else {
          // Fallback to dashboard if sandbox start fails but project creates
          dispatch(setSandboxStatus('idle'));
          navigate('/');
        }
      }
    } catch (error) {
      console.error("Failed to connect project", error);
      dispatch(setSandboxStatus('idle'));
      setErrorMsg("Failed to import repository. Ensure it is public or you have the correct permissions.");
      setConnecting(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualUrl.trim()) return;
    handleConnectRepo(manualUrl.trim(), manualTitle.trim());
  };

  const filteredRepos = repos.filter(repo => 
    repo.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (repo.description && repo.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="connect-repo-wrapper">
      <Header showSearch={false} />

      <main className="connect-repo-content">
        <div className="top-actions">
          <button className="back-btn" onClick={() => navigate('/')}>
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </button>
        </div>

        <div className="header-section">
          <h1>Connect Repository</h1>
          <p>Integrate your version control system to enable automated workflows and live deployments.</p>
        </div>

        {errorMsg && (
          <div className="error-banner">
            {errorMsg}
          </div>
        )}

        <div className="split-layout">
          {/* LEFT SIDEBAR */}
          <div className="info-sidebar">
            <div className="steps-list">
              <div className="step-item active">
                <div className="step-number">1</div>
                <div className="step-content">
                  <h4>Choose Provider</h4>
                  <p>Select GitHub, GitLab, or Bitbucket.</p>
                </div>
              </div>
              <div className="step-item">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h4>Select Repository</h4>
                  <p>Choose the project you want to connect.</p>
                </div>
              </div>
              <div className="step-item">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h4>Configure Build</h4>
                  <p>Define build and installation commands.</p>
                </div>
              </div>
            </div>

            <div className="ai-security-card">
              <div className="card-header">
                <span className="shield-icon"><ShieldCheck color="#4285f4" /></span>
                <h4>AI-Security Ready</h4>
              </div>
              <p>Once connected, our DevSecOps agent automatically scans every push for vulnerabilities.</p>
            </div>
          </div>

          {/* RIGHT CONTENT */}
          <div className="provider-section">
            <div className="provider-tabs-wrapper">
              <h3>VCS Provider</h3>
              <div className="provider-tabs">
                <button className="provider-tab active">
                  <FaGithub size={20} />
                  <span>GitHub</span>
                </button>
                <button className="provider-tab disabled">
                  <span className="badge">SOON</span>
                  <SiGitlab size={20} />
                  <span>GitLab</span>
                </button>
                <button className="provider-tab disabled">
                  <span className="badge">SOON</span>
                  <IoLogoBitbucket size={20} />
                  <span>Bitbucket</span>
                </button>
              </div>
            </div>

            {isGithubUser ? (
              <>
              <div className="repository-list-wrapper">
                <div className="list-header">
                  <h3>Repository</h3>
                  <div className="search-bar">
                    <Search size={16} className="search-icon" />
                    <input 
                      type="text" 
                      placeholder="Search repositories..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div className="repos-container">
                  {loadingRepos ? (
                    <div className="loading-state">
                      <Loader2 size={24} className="spin" />
                      <p>Fetching repositories...</p>
                    </div>
                  ) : repos.length === 0 ? (
                    <div className="empty-state">
                      <p>No repositories found. Create one on GitHub first.</p>
                    </div>
                  ) : filteredRepos.length === 0 ? (
                    <div className="empty-state">
                      <p>No matching repositories.</p>
                    </div>
                  ) : (
                    <div className="repos-list">
                      {filteredRepos.map(repo => (
                        <button 
                          key={repo.id} 
                          className="repo-list-item"
                          disabled={connecting}
                          onClick={() => handleConnectRepo(repo.html_url, repo.name)}
                        >
                          <span className="terminal-icon">{'>_'}</span>
                          <span className="repo-name">{repo.full_name}</span>
                          {connecting && <Loader2 size={16} className="spin connect-spin" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
                <div className="advanced-config-wrapper" style={{ marginTop: '20px', borderTop: '1px solid #222', paddingTop: '20px' }}>
                  <div className="list-header" style={{ cursor: 'pointer', marginBottom: showAdvanced ? '15px' : '0' }} onClick={() => setShowAdvanced(!showAdvanced)}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#ccc' }}>
                      Advanced Configuration
                      {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </h3>
                  </div>
                  
                  {showAdvanced && (
                    <div className="manual-import-form">
                      <div className="form-group">
                        <label style={{ fontSize: '12px', color: '#888', marginBottom: '8px', display: 'block' }}>Install Command (Optional)</label>
                        <div className="input-with-icon">
                          <Terminal size={16} />
                          <input 
                            type="text" 
                            placeholder="e.g. npm install" 
                            value={installCmd}
                            onChange={(e) => setInstallCmd(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="form-group">
                        <label style={{ fontSize: '12px', color: '#888', marginBottom: '8px', display: 'block' }}>Start Command (Optional)</label>
                        <div className="input-with-icon">
                          <Play size={16} />
                          <input 
                            type="text" 
                            placeholder="e.g. npm run dev" 
                            value={startCmd}
                            onChange={(e) => setStartCmd(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="form-group">
                        <label style={{ fontSize: '12px', color: '#888', marginBottom: '8px', display: 'block' }}>Port</label>
                        <div className="input-with-icon">
                          <Hash size={16} />
                          <input 
                            type="number" 
                            placeholder="e.g. 5173" 
                            value={port || ''}
                            onChange={(e) => setPort(e.target.value ? Number(e.target.value) : 5173)}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="repository-list-wrapper">
                 <div className="list-header">
                  <h3>Public Repository URL</h3>
                </div>
                <p className="help-text">
                  Since you logged in with Google, please provide a public Git repository URL.
                </p>

                <form className="manual-import-form" onSubmit={handleManualSubmit}>
                  <div className="form-group">
                    <div className="input-with-icon">
                      <LinkIcon size={16} />
                      <input 
                        type="url" 
                        placeholder="https://github.com/username/repo" 
                        value={manualUrl}
                        onChange={(e) => setManualUrl(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <div className="input-with-icon">
                      <Plus size={16} />
                      <input 
                        type="text" 
                        placeholder="Project Name (Optional)" 
                        value={manualTitle}
                        onChange={(e) => setManualTitle(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="advanced-config-wrapper" style={{ marginTop: '20px', borderTop: '1px solid #222', paddingTop: '20px', marginBottom: '20px' }}>
                    <div className="list-header" style={{ cursor: 'pointer', marginBottom: showAdvanced ? '15px' : '0' }} onClick={() => setShowAdvanced(!showAdvanced)}>
                      <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#ccc' }}>
                        Advanced Configuration
                        {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </h3>
                    </div>
                    
                    {showAdvanced && (
                      <div className="manual-import-form" style={{ marginTop: 0 }}>
                        <div className="form-group">
                          <label style={{ fontSize: '12px', color: '#888', marginBottom: '8px', display: 'block' }}>Install Command (Optional)</label>
                          <div className="input-with-icon">
                            <Terminal size={16} />
                            <input 
                              type="text" 
                              placeholder="e.g. npm install" 
                              value={installCmd}
                              onChange={(e) => setInstallCmd(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="form-group">
                          <label style={{ fontSize: '12px', color: '#888', marginBottom: '8px', display: 'block' }}>Start Command (Optional)</label>
                          <div className="input-with-icon">
                            <Play size={16} />
                            <input 
                              type="text" 
                              placeholder="e.g. npm run dev" 
                              value={startCmd}
                              onChange={(e) => setStartCmd(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="form-group">
                          <label style={{ fontSize: '12px', color: '#888', marginBottom: '8px', display: 'block' }}>Port</label>
                          <div className="input-with-icon">
                            <Hash size={16} />
                            <input 
                              type="number" 
                              placeholder="e.g. 5173" 
                              value={port || ''}
                              onChange={(e) => setPort(e.target.value ? Number(e.target.value) : 5173)}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <button 
                    type="submit" 
                    className="submit-btn"
                    disabled={connecting || !manualUrl.trim()}
                  >
                    {connecting ? (
                      <>
                        <Loader2 size={18} className="spin" />
                        <span>Importing...</span>
                      </>
                    ) : (
                      <span>Import Project</span>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {connecting && (
          <div className="connecting-overlay">
            <div className="connecting-modal">
              <Loader2 size={48} className="spin primary-color" />
              <h3>Creating your Sandbox...</h3>
              <p>Cloning repository and configuring environment</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ConnectRepo;
