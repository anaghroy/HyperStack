import React, { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import StatusBar from './StatusBar';
import BottomPanel from '../panels/BottomPanel';
import EditorPane from '../editor/EditorPane';
import FileTree from '../explorer/FileTree';
import SearchPanel from '../explorer/SearchPanel';
import AIChatPanel from '../panels/AIChatPanel';
import ArchitectureGraph from '../graph/ArchitectureGraph';
import DatabaseDesignerHub from '../db-designer/DatabaseDesignerHub';
import { startSandbox, createProject, sendHeartbeat } from '../../services/api';

import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setIsAIChatOpen } from '../../redux/slices/projectSlice';

const IDE = () => {
  const { activeProject, sandboxId, isAIChatOpen } = useSelector((state) => state.project);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('explorer');
  const [activePanel, setActivePanel] = useState('terminal');
  const [panelHeight, setPanelHeight] = useState(300);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [isPanelFullscreen, setIsPanelFullscreen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedLine, setSelectedLine] = useState(null);
  const [aiChatWidth, setAiChatWidth] = useState(350);

  const containerRef = useRef(null);

  useEffect(() => {
    if (!activeProject || !sandboxId) {
      navigate('/');
    }
  }, [activeProject, sandboxId, navigate]);

  // Heartbeat mechanism to prevent sandbox from hibernating while active
  useEffect(() => {
    if (!sandboxId) return;

    // Send heartbeat immediately on load
    sendHeartbeat(sandboxId).catch(err => console.error("Heartbeat failed", err));

    // Send heartbeat every 5 minutes (300000 ms)
    const interval = setInterval(() => {
      sendHeartbeat(sandboxId).catch(err => console.error("Heartbeat failed", err));
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [sandboxId]);

  // Global Keyboard Shortcut for Terminal
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Toggle terminal on Ctrl + ` or Ctrl + ~
      if (e.ctrlKey && (e.key === '`' || e.key === '~')) {
        e.preventDefault();
        setIsPanelOpen((prev) => !prev);
        if (!isPanelOpen) setActivePanel('terminal');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPanelOpen]);

  // Resizing Handlers
  const startSidebarResize = useCallback((e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const onMouseMove = (moveEvent) => {
      const newWidth = Math.max(150, Math.min(startWidth + (moveEvent.clientX - startX), 600));
      setSidebarWidth(newWidth);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [sidebarWidth]);

  const startPanelResize = useCallback((e) => {
    e.preventDefault();
    if (isPanelFullscreen) return; // Disable drag if fullscreen
    const startY = e.clientY;
    const startHeight = panelHeight;

    const onMouseMove = (moveEvent) => {
      // Height changes inversely to mouse Y position (moving up increases height)
      const newHeight = Math.max(100, Math.min(startHeight - (moveEvent.clientY - startY), window.innerHeight - 150));
      setPanelHeight(newHeight);
      if (!isPanelOpen && newHeight > 100) setIsPanelOpen(true);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [panelHeight, isPanelFullscreen, isPanelOpen]);

  return (
    <div className="ide-container" ref={containerRef}>
      <TopBar toggleAIChat={() => dispatch(setIsAIChatOpen(!isAIChatOpen))} />
      
      <div className="ide-main">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab}>
          <div className="sidebar-pane" style={{ width: sidebarWidth }}>
            {activeTab === 'explorer' && (
              <>
                <div className="pane-header">EXPLORER</div>
                {sandboxId ? (
                  <FileTree onSelectFile={setSelectedFile} />
                ) : (
                  <div style={{ padding: '16px', color: 'var(--color-text-secondary)', fontSize: '12px' }}>Initializing Workspace...</div>
                )}
              </>
            )}
            {activeTab === 'graph' && (
              <>
                <div className="pane-header">ARCHITECTURE GRAPH</div>
                <div style={{ padding: '16px', color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                  The Architecture Graph is open in the main view.
                </div>
              </>
            )}
            {activeTab === 'search' && (
              <>
                <div className="pane-header">SEARCH</div>
                {sandboxId ? (
                  <SearchPanel onSelectFile={({ path, line }) => {
                    setSelectedFile(path);
                    setSelectedLine(line);
                  }} />
                ) : (
                  <div style={{ padding: '16px', color: 'var(--color-text-secondary)', fontSize: '12px' }}>Initializing Workspace...</div>
                )}
              </>
            )}
            {activeTab === 'db-designer' && (
              <>
                <div className="pane-header">DATABASE DESIGNER</div>
                <div style={{ padding: '16px', color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                  The Database Designer Hub is open in the main view.
                </div>
              </>
            )}
            {activeTab !== 'explorer' && activeTab !== 'graph' && activeTab !== 'search' && activeTab !== 'db-designer' && (
              <div className="pane-header">{activeTab.toUpperCase()}</div>
            )}
          </div>
          <div className="resizer-vertical" onMouseDown={startSidebarResize} />
        </Sidebar>
        
        <div className="ide-editor-area">
          <div className="editor-wrapper" style={{ display: isPanelFullscreen ? 'none' : 'flex', flexGrow: 1, minHeight: 0, flexDirection: 'column' }}>
            {activeTab === 'graph' ? (
              <ArchitectureGraph />
            ) : activeTab === 'db-designer' ? (
              <DatabaseDesignerHub />
            ) : (
              <EditorPane selectedFile={selectedFile} selectedLine={selectedLine} />
            )}
          </div>
          
          {isPanelOpen && (
            <div className="bottom-panel-wrapper" style={{ height: isPanelFullscreen ? '100%' : `${panelHeight}px`, display: 'flex', flexDirection: 'column' }}>
              <div className="resizer-horizontal" onMouseDown={startPanelResize} />
              <BottomPanel 
                activePanel={activePanel} 
                setActivePanel={setActivePanel}
                isFullscreen={isPanelFullscreen}
                toggleFullscreen={() => setIsPanelFullscreen(!isPanelFullscreen)}
                onClose={() => setIsPanelOpen(false)}
              />
            </div>
          )}
        </div>

        {isAIChatOpen && (
          <AIChatPanel 
            width={aiChatWidth} 
            onClose={() => dispatch(setIsAIChatOpen(false))} 
          />
        )}
      </div>
      
      <StatusBar />
    </div>
  );
};

export default IDE;
