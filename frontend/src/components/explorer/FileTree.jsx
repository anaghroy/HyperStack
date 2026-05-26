import React, { useState, useEffect } from 'react';
import { getFileIcon } from '../common/FileIcons';
import { ChevronRight, ChevronDown, RefreshCw } from 'lucide-react';
import { listFiles, getSandboxId } from '../../services/api';
import { io } from 'socket.io-client';

const FileNode = ({ name, fullPath, isDir, children, depth = 0, onSelectFile }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = () => {
    if (isDir) {
      setIsOpen(!isOpen);
    } else {
      onSelectFile(fullPath);
    }
  };

  return (
    <div>
      <div 
        className={`file-node ${!isDir ? 'file' : 'folder'}`} 
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleClick}
      >
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
        <span className="file-node-name">{name}</span>
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

  // Mock tree building from flat list
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

  if (loading) return <div className="tree-loading">Loading workspace...</div>;

  return (
    <div className="file-tree-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid var(--border-color)', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>WORKSPACE</span>
        <RefreshCw size={14} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => fetchFiles()} />
      </div>
      <div className="file-tree" style={{ flex: 1, overflowY: 'auto' }}>
        {files.map((node, index) => (
          <FileNode key={index} {...node} onSelectFile={onSelectFile} />
        ))}
      </div>
    </div>
  );
};

export default FileTree;
