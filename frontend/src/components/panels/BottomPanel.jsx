import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { io } from 'socket.io-client';
import '@xterm/xterm/css/xterm.css';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import { getSandboxId } from '../../services/api';

const TerminalPanel = () => {
  const terminalRef = useRef(null);

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

  return <div ref={terminalRef} className="xterm-container" style={{ height: '100%', width: '100%', padding: '8px' }} />;
};

const BottomPanel = ({ activePanel, setActivePanel, isFullscreen, toggleFullscreen, onClose }) => {
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
        {activePanel === 'terminal' && <TerminalPanel />}
        {activePanel === 'output' && <div className="panel-placeholder">Output will appear here...</div>}
        {activePanel === 'services' && <div className="panel-placeholder">Service Monitor...</div>}
      </div>
    </div>
  );
};

export default BottomPanel;
