import React, { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { Play, RotateCcw, Box, Copy, Check, Save, Layout, Globe, RefreshCw } from "lucide-react";
import "./EditorPane.scss";
import { invokeAutocomplete, readFile, updateFile, getSandboxId } from "../../services/api";

const EditorPane = ({ selectedFile }) => {
  const [activeTab, setActiveTab] = useState(null);
  const [fileContents, setFileContents] = useState({});
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveTimeoutRef = useRef(null);

  const [openTabs, setOpenTabs] = useState([]);
  const editorRef = useRef(null);
  
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [browserUrl, setBrowserUrl] = useState("");
  const iframeRef = useRef(null);

  useEffect(() => {
    const sandboxId = getSandboxId();
    if (sandboxId) {
      const url = `http://${sandboxId}.preview.localhost`;
      setPreviewUrl(url);
      setBrowserUrl(url);
    }
  }, []);

  useEffect(() => {
    const fileToOpen = selectedFile?.path || (typeof selectedFile === 'string' ? selectedFile : null);
    
    if (fileToOpen) {
      setOpenTabs((prev) => {
        if (!prev.includes(fileToOpen)) return [...prev, fileToOpen];
        return prev;
      });
      setActiveTab(fileToOpen);
      
      setFileContents((prev) => {
        if (prev[fileToOpen] === undefined) {
          loadFile(fileToOpen);
        }
        return prev;
      });
    }
  }, [selectedFile]);

  const loadFile = async (filename) => {
    try {
      const data = await readFile(filename);
      if (data && data.files && data.files.length > 0) {
        setFileContents((prev) => ({
          ...prev,
          [filename]: data.files[0][filename.startsWith('/') ? filename : '/' + filename] || data.files[0][filename] || "",
        }));
      }
    } catch (error) {
      console.error("Failed to load file:", error);
    }
  };

  const handleEditorChange = (value) => {
    // Only update content reference to avoid heavy re-renders
    fileContents[activeTab] = value;

    // Auto-save debounce
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveFile(activeTab, value);
    }, 1000);
  };

  const saveFile = async (filename, content) => {
    setSaving(true);
    try {
      await updateFile(filename, content);
    } catch (error) {
      console.error("Failed to save file:", error);
    } finally {
      setSaving(false);
    }
  };

  const closeTab = (e, tabToClose) => {
    e.stopPropagation();
    const newTabs = openTabs.filter(t => t !== tabToClose);
    setOpenTabs(newTabs);
    
    if (activeTab === tabToClose) {
      setActiveTab(newTabs.length > 0 ? newTabs[newTabs.length - 1] : null);
    }
  };

  const copyCode = () => {
    if (activeTab && fileContents[activeTab] !== undefined) {
      navigator.clipboard.writeText(fileContents[activeTab]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleEditorDidMount = (editor, monaco) => {
    monaco.languages.registerInlineCompletionsProvider("javascript", {
      provideInlineCompletions: async (model, position, context, token) => {
        const textUntilPosition = model.getValueInRange({
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });

        // Trigger autocomplete only if the user explicitly types or waits
        if (context.triggerKind === monaco.languages.InlineCompletionTriggerKind.Explicit || textUntilPosition.trim().length > 10) {
          try {
            const completion = await invokeAutocomplete(textUntilPosition);
            if (completion) {
              return {
                items: [
                  {
                    insertText: completion,
                    range: new monaco.Range(
                      position.lineNumber,
                      position.column,
                      position.lineNumber,
                      position.column
                    ),
                  },
                ],
              };
            }
          } catch (err) {
            console.error("Autocomplete failed:", err);
          }
        }
        return { items: [] };
      },
      freeInlineCompletions: true,
    });
  };

  if (openTabs.length === 0) {
    return (
      <div className="editor-empty-state">
        <Box size={48} className="empty-icon" />
        <h3>No file selected</h3>
        <p>Select a file from the explorer to start editing</p>
      </div>
    );
  }

  return (
    <div className="editor-pane">
      <div className="editor-header">
        <div className="editor-tabs">
          {openTabs.map((file) => (
            <div
              key={file}
              className={`editor-tab ${activeTab === file ? "active" : ""}`}
              onClick={() => setActiveTab(file)}
            >
              <span className="tab-name">{file.split("/").pop()}</span>
              {activeTab === file && (
                <button
                  className="close-tab"
                  onClick={(e) => closeTab(e, file)}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="editor-actions">
          <span className="save-status">
            {saving ? 'Saving...' : 'Saved'}
          </span>
          <button 
            className={`action-button ${showPreview ? 'active' : ''}`} 
            onClick={() => setShowPreview(!showPreview)} 
            title="Toggle Live Preview"
          >
            <Layout size={14} />
            <span>Preview</span>
          </button>
          <button className="action-button copy-btn" onClick={copyCode} title="Copy code">
            {copied ? <Check size={14} className="success" /> : <Copy size={14} />}
          </button>
        </div>
      </div>
      <div className="editor-content">
        <div className="editor-wrapper">
          {!activeTab ? (
            <div className="empty-state">Select a file from tabs</div>
          ) : fileContents[activeTab] === undefined ? (
            <div className="loading-state">Loading file...</div>
          ) : (
            <Editor
              height="100%"
              path={activeTab}
              defaultLanguage={activeTab.endsWith(".js") || activeTab.endsWith(".jsx") ? "javascript" : activeTab.endsWith(".json") ? "json" : activeTab.endsWith(".css") ? "css" : activeTab.endsWith(".html") ? "html" : "typescript"}
              theme="vs-dark"
              defaultValue={fileContents[activeTab]}
              onChange={handleEditorChange}
              onMount={(editor, monaco) => {
                editorRef.current = editor;
                handleEditorDidMount(editor, monaco);
              }}
              options={{
                minimap: { enabled: false },
                fontSize: 16,
                fontFamily: "JetBrains Mono, monospace",
                lineHeight: 24,
                padding: { top: 16 },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                cursorBlinking: "smooth",
                cursorSmoothCaretAnimation: "on",
                formatOnPaste: true,
                inlineSuggest: { enabled: true },
              }}
            />
          )}
        </div>
        
        {showPreview && (
          <div className="preview-pane">
            <div className="browser-header">
              <button 
                className="refresh-btn"
                onClick={() => {
                  if (iframeRef.current) {
                    iframeRef.current.src = iframeRef.current.src;
                  }
                }}
                title="Refresh Preview"
              >
                <RefreshCw size={14} />
              </button>
              <div className="address-bar">
                <Globe size={12} className="globe-icon" />
                <span className="url-text">{browserUrl}</span>
              </div>
            </div>
            <iframe 
              ref={iframeRef}
              src={previewUrl} 
              title="Live Preview" 
              sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default EditorPane;
