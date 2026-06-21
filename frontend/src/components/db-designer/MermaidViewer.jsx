import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { ZoomIn, ZoomOut, Maximize, Minimize, RefreshCw } from 'lucide-react';

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  fontFamily: 'inherit',
});

const MermaidViewer = ({ chart }) => {
  const containerRef = useRef(null);
  const [svgContent, setSvgContent] = useState('');
  const [error, setError] = useState(null);

  // Pan, Zoom, and Fullscreen state
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const renderChart = async () => {
      if (!chart) return;
      
      // Generate a unique ID for the mermaid render
      const id = `mermaid-svg-${Math.random().toString(36).substring(2, 9)}`;
      
      try {
        setError(null);
        // Pre-validate syntax before rendering to prevent aggressive error injection
        await mermaid.parse(chart);
        const { svg } = await mermaid.render(id, chart);
        
        if (isMounted) {
          setSvgContent(svg);
          // Reset zoom and pan when a new chart is rendered
          setScale(1);
          setPosition({ x: 0, y: 0 });
        }
      } catch (err) {
        console.error("Mermaid parsing error:", err);
        
        // Mermaid automatically appends error SVGs to the document body if parsing fails
        // We must manually clean it up to prevent vertical scrollbars and stray error text
        const errorNode = document.getElementById(id);
        if (errorNode) {
          errorNode.remove();
        }
        
        // Sometimes it appends with 'd' prefix
        const dErrorNode = document.getElementById('d' + id);
        if (dErrorNode) {
          dErrorNode.remove();
        }
        
        if (isMounted) {
          setError("Failed to render diagram. The generated syntax might be invalid.");
          setSvgContent('');
        }
      }
    };

    renderChart();

    return () => {
      isMounted = false;
    };
  }, [chart]);

  // Interaction handlers
  const handleWheel = (e) => {
    if (!svgContent) return;
    // Don't scroll the page when zooming
    e.preventDefault(); 
    e.stopPropagation();
    
    const scaleFactor = -e.deltaY * 0.001;
    setScale(s => Math.min(Math.max(0.1, s + scaleFactor), 5));
  };

  const handlePointerDown = (e) => {
    if (!svgContent) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handlePointerMove = (e) => {
    if (isDragging) {
      e.preventDefault();
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handlePointerLeave = () => {
    setIsDragging(false);
  };

  const resetView = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const zoomIn = () => setScale(s => Math.min(s + 0.2, 5));
  const zoomOut = () => setScale(s => Math.max(0.1, s - 0.2));
  const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

  // Styles for normal vs fullscreen
  const containerStyle = isFullscreen ? {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    zIndex: 9999,
    backgroundColor: '#ffffff',
  } : {
    width: '100%', 
    height: '100%', 
    position: 'relative',
    backgroundColor: '#ffffff',
    overflow: 'hidden'
  };

  return (
    <div 
      className="mermaid-viewer-container" 
      style={{
        ...containerStyle,
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        flexDirection: 'column'
      }}
      onWheel={handleWheel}
    >
      {/* Controls Toolbar */}
      {svgContent && !error && (
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          display: 'flex',
          gap: '8px',
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '6px',
          borderRadius: '6px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          zIndex: 10
        }}>
          <button onClick={zoomIn} title="Zoom In" style={btnStyle}><ZoomIn size={16} /></button>
          <button onClick={zoomOut} title="Zoom Out" style={btnStyle}><ZoomOut size={16} /></button>
          <button onClick={resetView} title="Reset View" style={btnStyle}><RefreshCw size={16} /></button>
          <div style={{ width: '1px', background: '#e5e7eb', margin: '0 4px' }} />
          <button onClick={toggleFullscreen} title="Toggle Fullscreen" style={btnStyle}>
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div 
        style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
      >
        {error ? (
          <div style={{ color: '#ef4444', textAlign: 'center', padding: '20px' }}>
            <p>{error}</p>
            <pre style={{ fontSize: '11px', color: '#6b7280', marginTop: '8px', textAlign: 'left', background: '#f3f4f6', padding: '8px', borderRadius: '4px', maxWidth: '80vw', overflow: 'auto' }}>
              {chart}
            </pre>
          </div>
        ) : svgContent ? (
          <div 
            ref={containerRef} 
            dangerouslySetInnerHTML={{ __html: svgContent }} 
            style={{ 
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.1s ease',
              cursor: isDragging ? 'grabbing' : 'grab',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          />
        ) : (
          <div style={{ color: '#9ca3af' }}>Rendering diagram...</div>
        )}
      </div>
    </div>
  );
};

const btnStyle = {
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  padding: '4px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#374151',
  borderRadius: '4px',
};

export default MermaidViewer;
