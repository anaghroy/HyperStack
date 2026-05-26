import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { getFileIcon } from '../common/FileIcons';
import { X } from 'lucide-react';
import { readFile, updateFile } from '../../services/api';

const EditorPane = ({ selectedFile }) => {
  const [activeTab, setActiveTab] = useState(null);
  const [tabs, setTabs] = useState([]);
  const [fileContents, setFileContents] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedFile) {
      if (!tabs.includes(selectedFile)) {
        setTabs([...tabs, selectedFile]);
      }
      setActiveTab(selectedFile);
    }
  }, [selectedFile]);

  useEffect(() => {
    const fetchContent = async () => {
      if (activeTab && !fileContents[activeTab]) {
        setLoading(true);
        try {
          const res = await readFile(activeTab);
          if (res.files && res.files.length > 0) {
            const fileData = res.files[0];
            const content = fileData[activeTab] || fileData['/' + activeTab] || '';
            setFileContents(prev => ({ ...prev, [activeTab]: content }));
          }
        } catch (error) {
          console.error("Failed to read file", error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchContent();
  }, [activeTab]);

  const handleEditorChange = (value) => {
    if (activeTab) {
      setFileContents(prev => ({ ...prev, [activeTab]: value }));
      // We could debounce updateFile here, or implement a save shortcut.
      // For now, we update on every change as a naive autosave (or maybe we shouldn't to avoid spam).
      // updateFile('/' + activeTab, value).catch(console.error);
    }
  };

  const closeTab = (e, tabToClose) => {
    e.stopPropagation();
    const newTabs = tabs.filter(t => t !== tabToClose);
    setTabs(newTabs);
    if (activeTab === tabToClose) {
      setActiveTab(newTabs.length > 0 ? newTabs[newTabs.length - 1] : null);
    }
  };

  // Get language from extension
  const getLanguage = (filename) => {
    if (!filename) return 'javascript';
    if (filename.endsWith('.js') || filename.endsWith('.jsx')) return 'javascript';
    if (filename.endsWith('.ts') || filename.endsWith('.tsx')) return 'typescript';
    if (filename.endsWith('.json')) return 'json';
    if (filename.endsWith('.css') || filename.endsWith('.scss')) return 'css';
    if (filename.endsWith('.html')) return 'html';
    return 'plaintext';
  };

  return (
    <div className="editor-pane">
      <div className="editor-tabs">
        {tabs.map(tab => (
          <div 
            key={tab} 
            className={`editor-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            <span className="tab-icon">{getFileIcon(tab)}</span>
            <span className="tab-name">{tab.split('/').pop()}</span>
            <span className="tab-close" onClick={(e) => closeTab(e, tab)}><X size={14} /></span>
          </div>
        ))}
      </div>
      <div className="editor-content">
        {!activeTab ? (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-sans)' }}>
            Select a file to edit
          </div>
        ) : loading && !fileContents[activeTab] ? (
          <div style={{ padding: '16px', color: 'var(--color-text-secondary)' }}>Loading...</div>
        ) : (
          <Editor
            height="100%"
            language={getLanguage(activeTab)}
            theme="vs-dark"
            value={fileContents[activeTab] || ''}
            onChange={handleEditorChange}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: 'JetBrains Mono, monospace',
              padding: { top: 16 },
              scrollBeyondLastLine: false,
              smoothScrolling: true,
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: true,
              formatOnPaste: true,
            }}
          />
        )}
      </div>
    </div>
  );
};

export default EditorPane;
