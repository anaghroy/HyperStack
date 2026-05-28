import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { io } from 'socket.io-client';
import '@xterm/xterm/css/xterm.css';
import { X, Maximize2, Minimize2, Sparkles } from 'lucide-react';
import { getSandboxId } from '../../services/api';
import { useDispatch } from 'react-redux';
import { setIsAIChatOpen, setAiInitialMessage } from '../../redux/slices/projectSlice';

const TerminalPanel = ({ onAnalyze }) => {
  const terminalRef = useRef(null);
  const bufferRef = useRef("");

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Terminal({
      theme: {
        background: '#181818',
        foreground: '#e6edf7', // var(--color-text-primary)
        cursor: '#8ab4ff',
        selectionBackground: '#2b3754',
      },
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 13,
      cursorBlink: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());

    term.open(terminalRef.current);
    fitAddon.fit();

    term.writeln('Welcome to \x1b[1;34mHyperStack Terminal\x1b[0m');
    
    const sandboxId = getSandboxId();
    if (!sandboxId) {
      term.writeln('\x1b[1;31mError: Sandbox not initialized\x1b[0m');
    } else {
      term.writeln(`$ Connecting to sandbox ${sandboxId}...`);
      
      const socket = io(`http://${sandboxId}.agent.localhost`, {
        transports: ['websocket', 'polling']
      });

      socket.on('connect', () => {
        term.writeln('\r\n\x1b[1;32mConnected to sandbox terminal.\x1b[0m\r\n');
      });

      socket.on('terminal-output', (data) => {
        term.write(data);
        // Maintain a rolling buffer of ~2000 chars for context
        bufferRef.current += data;
        if (bufferRef.current.length > 3000) {
          bufferRef.current = bufferRef.current.slice(-2000);
        }
      });

      term.onData((data) => {
        socket.emit('terminal-input', data);
      });

      const resizeObserver = new ResizeObserver(() => {
        try {
          fitAddon.fit();
        } catch (e) {}
      });
      resizeObserver.observe(terminalRef.current);

      return () => {
        resizeObserver.disconnect();
        term.dispose();
        socket.disconnect();
      };
    }
  }, []);

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      <button 
        className="ai-analyze-btn" 
        onClick={() => onAnalyze(bufferRef.current)}
        title="Analyze terminal output with AI"
        style={{
          position: 'absolute', right: '16px', top: '8px', zIndex: 10,
          background: 'rgba(30, 31, 32, 0.84)', border: '1px solid rgb(199, 202, 206)',
          color: '#e6edf7', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '500'
        }}
      >
        <Sparkles size={12} color="#3b82f6" />
        Analyze
      </button>
      <div ref={terminalRef} className="xterm-container" style={{ height: '100%', width: '100%', padding: '8px', paddingTop: '32px' }} />
    </div>
  );
};

const BottomPanel = ({ activePanel, setActivePanel, isFullscreen, toggleFullscreen, onClose }) => {
  const dispatch = useDispatch();

  const handleAnalyzeTerminal = (buffer) => {
    // strip basic ANSI escape codes if possible, or just send raw
    const cleanBuffer = buffer.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
    dispatch(setIsAIChatOpen(true));
    dispatch(setAiInitialMessage(`I ran a command in my terminal and got this output. Please analyze it and tell me how to fix any errors:\n\`\`\`\n${cleanBuffer}\n\`\`\``));
  };
  return (
    <div className="bottom-panel" style={{ height: '100%' }}>
      <div className="panel-header">
        <div className="panel-tabs">
          <div 
            className={`panel-tab ${activePanel === 'terminal' ? 'active' : ''}`}
            onClick={() => setActivePanel('terminal')}
          >
            TERMINAL
          </div>
          <div 
            className={`panel-tab ${activePanel === 'output' ? 'active' : ''}`}
            onClick={() => setActivePanel('output')}
          >
            OUTPUT
          </div>
          <div 
            className={`panel-tab ${activePanel === 'services' ? 'active' : ''}`}
            onClick={() => setActivePanel('services')}
          >
            SERVICES
          </div>
        </div>
        <div className="panel-actions">
          {isFullscreen ? (
            <Minimize2 size={14} className="panel-action-icon" onClick={toggleFullscreen} />
          ) : (
            <Maximize2 size={14} className="panel-action-icon" onClick={toggleFullscreen} />
          )}
          <X size={14} className="panel-action-icon" onClick={onClose} />
        </div>
      </div>
      
      <div className="panel-content">
        {activePanel === 'terminal' && <TerminalPanel onAnalyze={handleAnalyzeTerminal} />}
        {activePanel === 'output' && <div className="panel-placeholder">Output will appear here...</div>}
        {activePanel === 'services' && <div className="panel-placeholder">Service Monitor...</div>}
      </div>
    </div>
  );
};

export default BottomPanel;
