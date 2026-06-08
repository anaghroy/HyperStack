import React, { useState, useEffect } from 'react';
import { FileText, Code, Check, Copy, Save, Play } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { listFiles, readFile, updateFile, generateDocsAPI } from '../../services/api';

const ApiDocsHub = () => {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState('');
  const [format, setFormat] = useState('swagger');
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
        const allJsFiles = data.files.filter(path => {
          // Ignore node_modules, .git, dist, build at any level
          if (path.includes('node_modules/') || path.includes('.git/') || path.includes('dist/') || path.includes('build/')) {
            return false;
          }
          return /\.(js|jsx|ts|tsx|css|scss|sass|less|json|html|vue|svelte)$/i.test(path);
        }).sort();
        
        setFiles(allJsFiles);
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

      const res = await generateDocsAPI(content, format);
      setOutput(res.docs);
    } catch (error) {
      console.error("Docs generation error:", error);
      setOutput("// Failed to generate documentation. Please check server logs.");
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
    
    // Auto-generate a save path based on selected file and format
    const baseName = selectedFile.split('/').pop().split('.')[0];
    const extension = format === 'swagger' ? 'yaml' : 'md';
    const suggestedPath = `/docs/${baseName}-api.${extension}`;

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
    <div className="api-docs-hub">
      {/* Left Sidebar Setup */}
      <div className="docs-sidebar">
        <div className="sidebar-header">
          <div className="icon-wrapper">
            <FileText size={24} color="#4a90e2" />
          </div>
          <div>
            <h2>API Docs Gen</h2>
            <span>Powered by AI</span>
          </div>
        </div>

        <div className="form-group">
          <label>Source Router File</label>
          <select 
            value={selectedFile} 
            onChange={(e) => setSelectedFile(e.target.value)}
          >
            <option value="">-- Select a source file --</option>
            {files.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Output Format</label>
          <div className="format-toggle">
            <button 
              className={format === 'swagger' ? 'active' : ''}
              onClick={() => setFormat('swagger')}
            >
              <Code size={16} /> Swagger
            </button>
            <button 
              className={format === 'markdown' ? 'active' : ''}
              onClick={() => setFormat('markdown')}
            >
              <FileText size={16} /> Markdown
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
          {isGenerating ? 'Analyzing Routes...' : 'Generate Docs'}
        </button>
      </div>

      {/* Right Output Area */}
      <div className="docs-output-area">
        <div className="output-header">
          <span className="header-title">Generated Output</span>
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
              {saveSuccess ? <Check size={14} /> : <Save size={14} />} {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save to File'}
            </button>
          </div>
        </div>
        
        <div className="editor-container">
          {output ? (
            <Editor
              height="100%"
              language={format === 'swagger' ? 'yaml' : 'markdown'}
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
              <FileText size={48} opacity={0.2} />
              <p>Select a router file and click Generate to create API Documentation.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApiDocsHub;
