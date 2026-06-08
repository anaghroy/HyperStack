import React, { useState, useEffect } from 'react';
import { GitBranch, GitCommit, Search, RefreshCw, MessageSquare, ListTree, Play, Check, Copy } from 'lucide-react';
import { getGitInfoAPI, generateCommitMsgAPI } from '../../services/api';

const SourceControlPanel = () => {
  const [gitStatus, setGitStatus] = useState('');
  const [gitDiff, setGitDiff] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchGitInfo();
  }, []);

  const fetchGitInfo = async () => {
    setIsLoading(true);
    try {
      const data = await getGitInfoAPI();
      if (data && data.success) {
        const fullInfo = data.info || '';
        const parts = fullInfo.split('--- DIFF ---');
        setGitStatus(parts[0] ? parts[0].trim() : 'No status available');
        setGitDiff(parts[1] ? parts[1].trim() : 'No diff available');
      }
    } catch (err) {
      console.error("Failed to load git info", err);
      setGitStatus('Failed to load git status.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async (type) => {
    if (!gitStatus && !gitDiff) {
      alert("No git changes detected.");
      return;
    }

    setIsGenerating(true);
    setOutput('');

    try {
      const gitInfoPayload = `STATUS:\n${gitStatus}\n\nDIFF:\n${gitDiff}`;
      const res = await generateCommitMsgAPI(gitInfoPayload, type);
      setOutput(res.text);
    } catch (error) {
      console.error("Generate error:", error);
      setOutput("Failed to generate text. Please check server logs.");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="source-control-panel">
      <div className="panel-header-top">
        <h2>SOURCE CONTROL</h2>
        <button className="refresh-btn" onClick={fetchGitInfo} title="Refresh Git Status">
          <RefreshCw size={14} className={isLoading ? "spinning" : ""} />
        </button>
      </div>

      <div className="sc-section">
        <div className="sc-section-title">
          <GitBranch size={14} /> Git Status
        </div>
        <div className="sc-status-box">
          {isLoading ? (
            <span className="loading-text">Loading...</span>
          ) : (
            <pre>{gitStatus || 'Working tree clean'}</pre>
          )}
        </div>
      </div>

      <div className="sc-actions">
        <button 
          className="sc-btn primary" 
          onClick={() => handleGenerate('commit')}
          disabled={isGenerating || isLoading}
        >
          {isGenerating ? <div className="spinner"></div> : <GitCommit size={16} />} 
          AI Commit Message
        </button>
        <button 
          className="sc-btn secondary" 
          onClick={() => handleGenerate('pr')}
          disabled={isGenerating || isLoading}
        >
          {isGenerating ? <div className="spinner"></div> : <ListTree size={16} />} 
          AI PR Summary
        </button>
      </div>

      <div className="sc-output-section">
        <div className="sc-output-header">
          <span>AI Output</span>
          <button 
            className="copy-btn" 
            onClick={copyToClipboard}
            disabled={!output}
          >
            {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
          </button>
        </div>
        <textarea 
          className="sc-output-textarea"
          value={output}
          onChange={(e) => setOutput(e.target.value)}
          placeholder="Generated commit message or PR summary will appear here..."
        />
      </div>
    </div>
  );
};

export default SourceControlPanel;
