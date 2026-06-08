import React, { useState, useEffect } from 'react';
import { getFileIcon } from '../common/FileIcons';
import { ChevronRight, ChevronDown, RefreshCw, FilePlus, FolderPlus, Trash2 } from 'lucide-react';
import { listFiles, getSandboxId, createFiles, deleteItem } from '../../services/api';
import { io } from 'socket.io-client';

const FileNode = ({ name, fullPath, isDir, children, depth = 0, onSelectFile }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hover, setHover] = useState(false);

  const handleClick = () => {
    if (isDir) {
      setIsOpen(!isOpen);
    } else {
      // Send an object with a timestamp so clicking the same file always triggers an update
      onSelectFile({ path: fullPath, ts: Date.now() });
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        await deleteItem(fullPath);
        window.refreshFileTree && window.refreshFileTree();
      } catch (error) {
        console.error("Failed to delete", error);
      }
    }
  };

  return (
    <div>
      <div 
        className={`file-node ${!isDir ? 'file' : 'folder'}`} 
        style={{ 
          paddingLeft: `${depth * 12 + 8}px`, 
          paddingRight: '8px',
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}
        onClick={handleClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
          <span className="file-node-icon">
            {isDir ? (
              <span className="chevron">
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
            ) : (
              <span className="spacer" />
            )}
            {getFileIcon(isDir ? '' : name, isOpen)}
          </span>
          <span className="file-node-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
        </div>
        {hover && (
          <Trash2 size={12} style={{ color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={handleDelete} title="Delete" />
        )}
      </div>
      {isDir && isOpen && children && (
        <div className="file-node-children">
          {children.map((child, index) => (
            <FileNode 
              key={index} 
              {...child} 
              depth={depth + 1} 
              onSelectFile={onSelectFile}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FileTree = ({ onSelectFile }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [creatingMode, setCreatingMode] = useState(null); // 'file' or 'folder'
  const [newItemName, setNewItemName] = useState("");
  const inputRef = React.useRef(null);

  const buildTree = (flatFiles) => {
    const root = [];
    flatFiles.forEach(path => {
      const parts = path.split('/');
      let currentLevel = root;
      let cumulativePath = '';
      parts.forEach((part, index) => {
        cumulativePath += (index === 0 ? part : '/' + part);
        const existingPath = currentLevel.find(item => item.name === part);
        if (existingPath) {
          currentLevel = existingPath.children;
        } else {
          const isDir = index < parts.length - 1;
          const newItem = { name: part, fullPath: cumulativePath, isDir, children: isDir ? [] : null };
          currentLevel.push(newItem);
          currentLevel = newItem.children;
        }
      });
    });
    return root;
  };

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const data = await listFiles();
        if (data.files) {
          setFiles(buildTree(data.files));
        }
      } catch (error) {
        console.error('Error fetching files:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
    // Expose fetchFiles globally so we can call it manually if needed
    window.refreshFileTree = fetchFiles;

    const sandboxId = getSandboxId();
    if (sandboxId) {
      const socket = io(`http://${sandboxId}.agent.localhost`, {
        transports: ['websocket', 'polling']
      });
      socket.on('file-system-changed', fetchFiles);
      return () => {
        socket.disconnect();
      };
    }
  }, []);

  useEffect(() => {
    if (creatingMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [creatingMode]);

  if (loading) return <div className="tree-loading" style={{ padding: '16px' }}>Loading workspace...</div>;

  const handleCreateFile = () => {
    setCreatingMode('file');
    setNewItemName('');
  };

  const handleCreateFolder = () => {
    setCreatingMode('folder');
    setNewItemName('');
  };

  const submitNewItem = async () => {
    if (!newItemName.trim()) {
      setCreatingMode(null);
      return;
    }

    try {
      if (creatingMode === 'file') {
        await createFiles([{ file: newItemName.trim(), content: "" }]);
      } else if (creatingMode === 'folder') {
        await createFiles([{ file: `${newItemName.trim()}/.gitkeep`, content: "" }]);
      }
      window.refreshFileTree && window.refreshFileTree();
    } catch (err) {
      console.error(`Failed to create ${creatingMode}`, err);
    } finally {
      setCreatingMode(null);
      setNewItemName('');
    }
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      submitNewItem();
    } else if (e.key === 'Escape') {
      setCreatingMode(null);
      setNewItemName('');
    }
  };

  return (
    <div className="file-tree-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid var(--border-color)', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>WORKSPACE</span>
        <div style={{ display: 'flex', gap: '8px', color: 'var(--text-secondary)' }}>
          <FilePlus size={14} style={{ cursor: 'pointer' }} onClick={handleCreateFile} title="New File" />
          <FolderPlus size={14} style={{ cursor: 'pointer' }} onClick={handleCreateFolder} title="New Folder" />
          <RefreshCw size={14} style={{ cursor: 'pointer' }} onClick={() => window.refreshFileTree && window.refreshFileTree()} title="Refresh" />
        </div>
      </div>
      <div className="file-tree" style={{ flex: 1, overflowY: 'auto' }}>
        {creatingMode && (
          <div style={{ padding: '4px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {creatingMode === 'file' ? <FilePlus size={14} style={{ color: 'var(--text-secondary)' }} /> : <FolderPlus size={14} style={{ color: 'var(--text-secondary)' }} />}
            <input 
              ref={inputRef}
              type="text" 
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={handleInputKeyDown}
              onBlur={submitNewItem}
              placeholder={creatingMode === 'file' ? "e.g. src/utils.js" : "e.g. src/components"}
              style={{ flex: 1, backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '2px 4px', fontSize: '12px', outline: 'none', borderRadius: '2px' }}
            />
          </div>
        )}
        {files.map((node, index) => (
          <FileNode key={index} {...node} onSelectFile={onSelectFile} />
        ))}
      </div>
    </div>
  );
};

export default FileTree;
