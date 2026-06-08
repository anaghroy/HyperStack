import React, { useState, useEffect } from 'react';
import { FlaskConical, Code, Check, Copy, Save, Play } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { listFiles, readFile, updateFile, generateTestsAPI } from '../../services/api';

const TestHub = () => {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState('');
  const [framework, setFramework] = useState('jest');
  const [isGenerating, setIsGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const data = await listFiles();
      if (data && data.files) {
        // data.files is a flat array of string paths (e.g., "src/main.jsx")
        const allCodeFiles = data.files.filter(path => {
          // Ignore node_modules, .git, dist, build, and existing tests
          if (path.includes('node_modules/') || path.includes('.git/') || path.includes('dist/') || path.includes('build/')) {
            return false;
          }
          if (path.includes('__tests__/') || path.includes('.test.') || path.includes('.spec.')) {
            return false;
          }
          return /\.(js|jsx|ts|tsx)$/i.test(path);
        }).sort();
        
        setFiles(allCodeFiles);
      }
    } catch (err) {
      console.error("Failed to load files", err);
    }
  };

  const handleGenerate = async () => {
    if (!selectedFile) {
      alert("Please select a file first.");
      return;
    }

    setIsGenerating(true);
    setOutput('');

    try {
      const fileData = await readFile('/' + selectedFile);
      let content = '';
      if (fileData && fileData.files && fileData.files.length > 0) {
        content = fileData.files[0]['/' + selectedFile] || fileData.files[0][selectedFile] || "";
      }

      if (!content) {
        alert("Selected file is empty or could not be read.");
        setIsGenerating(false);
        return;
      }

      const res = await generateTestsAPI(content, selectedFile, framework);
      setOutput(res.tests);
    } catch (error) {
      console.error("Test generation error:", error);
      setOutput("// Failed to generate tests. Please check server logs.");
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

  const handleSaveFile = async () => {
    if (!output) return;
    
    // Auto-generate a save path based on selected file and framework in global __tests__
    // E.g., src/components/App.jsx -> /__tests__/src/components/App.test.jsx
    let cleanPath = selectedFile.startsWith('/') ? selectedFile.slice(1) : selectedFile;
    const suggestedPath = `/__tests__/${cleanPath.replace(/\.([a-zA-Z0-9]+)$/, '.test.$1')}`;

    const userInputPath = prompt("Enter file path to save:", suggestedPath);
    if (!userInputPath) return;

    setIsSaving(true);
    try {
      await updateFile(userInputPath, output);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save file", err);
      alert("Failed to save file.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="test-hub">
      {/* Left Sidebar Setup */}
      <div className="test-sidebar">
        <div className="sidebar-header">
          <div className="icon-wrapper">
            <FlaskConical size={24} color="#8b5cf6" />
          </div>
          <div>
            <h2>AI Test Hub</h2>
            <span>Auto-Test Generator</span>
          </div>
        </div>

        <div className="form-group">
          <label>Source File</label>
          <select 
            value={selectedFile} 
            onChange={(e) => setSelectedFile(e.target.value)}
          >
            <option value="">-- Select a file to test --</option>
            {files.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Testing Framework</label>
          <div className="format-toggle">
            <button 
              className={framework === 'jest' ? 'active' : ''}
              onClick={() => setFramework('jest')}
            >
              <Code size={16} /> Jest
            </button>
            <button 
              className={framework === 'vitest' ? 'active' : ''}
              onClick={() => setFramework('vitest')}
            >
              <Code size={16} /> Vitest
            </button>
            <button 
              className={framework === 'mocha' ? 'active' : ''}
              onClick={() => setFramework('mocha')}
            >
              <Code size={16} /> Mocha
            </button>
          </div>
        </div>

        <button 
          className="generate-btn"
          onClick={handleGenerate}
          disabled={!selectedFile || isGenerating}
        >
          {isGenerating ? (
            <div className="spinner"></div>
          ) : (
            <Play size={16} />
          )}
          {isGenerating ? 'Writing Tests...' : 'Generate Test Suite'}
        </button>
      </div>

      {/* Right Output Area */}
      <div className="test-output-area">
        <div className="output-header">
          <span className="header-title">Generated Test Suite</span>
          <div className="action-buttons">
            <button 
              className="copy-btn"
              onClick={copyToClipboard}
              disabled={!output}
            >
              {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />} {copied ? 'Copied!' : 'Copy'}
            </button>
            <button 
              className="save-btn"
              onClick={handleSaveFile}
              disabled={!output || isSaving}
            >
              {saveSuccess ? <Check size={14} /> : <Save size={14} />} {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save to __tests__'}
            </button>
          </div>
        </div>
        
        <div className="editor-container">
          {output ? (
            <Editor
              height="100%"
              language="javascript"
              theme="vs-dark"
              value={output}
              onChange={(val) => setOutput(val)}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                lineHeight: 1.6,
                padding: { top: 16 },
                scrollBeyondLastLine: false,
                wordWrap: "on"
              }}
            />
          ) : (
            <div className="empty-state">
              <FlaskConical size={48} opacity={0.2} />
              <p>Select a file and framework to instantly generate unit tests.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestHub;
