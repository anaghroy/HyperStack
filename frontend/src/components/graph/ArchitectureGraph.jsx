import {
  ReactFlow,
  addEdge,
  ConnectionLineType,
  Panel,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
  MarkerType,
} from '@xyflow/react';
import dagre from 'dagre';
import { getArchitectureGraph, listFiles, readFile } from '../../services/api';
import CustomNode from './CustomNode';
import '@xyflow/react/dist/style.css';
import { useState, useEffect, useCallback } from 'react';

const nodeTypes = {
  custom: CustomNode,
};

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 172;
const nodeHeight = 36;

const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const newNode = {
      ...node,
      targetPosition: isHorizontal ? 'left' : 'top',
      sourcePosition: isHorizontal ? 'right' : 'bottom',
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
    return newNode;
  });

  return { nodes: newNodes, edges };
};

const ArchitectureGraph = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);

  const fetchGraph = async () => {
    setLoading(true);
    try {
      const filePaths = await listFiles();
      const filesWithContent = [];
      // Only read code files where imports exist to prevent huge payloads and LLM context limits.
      if (filePaths.files) {
        const allowedExtensions = ['.js', '.jsx', '.ts', '.tsx', '.cjs', '.mjs', '.vue', '.svelte', '.py'];
        const ignoredDirs = ['node_modules', '.git', 'dist', 'build', '.next', '.nuxt', 'coverage'];
        
        const validFiles = filePaths.files.filter(f => {
          const lowerF = f.toLowerCase();
          const hasValidExtension = allowedExtensions.some(ext => lowerF.endsWith(ext));
          const isIgnored = ignoredDirs.some(dir => lowerF.includes('/' + dir + '/') || lowerF.startsWith(dir + '/'));
          return hasValidExtension && !isIgnored;
        });

        // Batch requests to prevent network overload
        const batchSize = 10;
        for (let i = 0; i < validFiles.length; i += batchSize) {
          const batch = validFiles.slice(i, i + batchSize);
          await Promise.all(batch.map(async (file) => {
            try {
              const data = await readFile(file);
              let content = '';
              if (data && data.files && data.files.length > 0) {
                content = data.files[0][file.startsWith('/') ? file : '/' + file] || data.files[0][file] || "";
              }
              // Limit content to top 20 lines (where imports usually are) to save tokens and payload size
              content = content.split('\n').slice(0, 20).join('\n');
              filesWithContent.push({ path: file, content });
            } catch (e) {
              console.error(`Failed to read file ${file}:`, e);
            }
          }));
        }
      }

      const graphData = await getArchitectureGraph(filesWithContent);
      
      const initialNodes = graphData.nodes.map(n => ({
        id: n.id,
        type: 'custom',
        data: { label: n.label, type: n.type },
        position: { x: 0, y: 0 }
      }));
      
      const initialEdges = graphData.edges.map((e, idx) => ({
        id: `e${idx}`,
        source: e.source,
        target: e.target,
        type: 'smoothstep',
        animated: true,
        label: e.label || 'imports',
        style: { stroke: '#4a90e2', strokeWidth: 1.5, strokeDasharray: '5 5' },
        labelStyle: { fill: '#fff', fontSize: 10, fontWeight: 700 },
        labelBgStyle: { fill: '#222', color: '#fff', padding: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 15,
          height: 15,
          color: '#4a90e2',
        },
      }));

      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        initialNodes,
        initialEdges
      );

      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    } catch (error) {
      console.error("Failed to load graph:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph();
  }, []);

  const onConnect = useCallback(
    (params) =>
      setEdges((eds) =>
        addEdge({ ...params, type: ConnectionLineType.SmoothStep, animated: true }, eds)
      ),
    []
  );

  const onLayout = useCallback(
    (direction) => {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        nodes,
        edges,
        direction
      );
      setNodes([...layoutedNodes]);
      setEdges([...layoutedEdges]);
    },
    [nodes, edges]
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div className="spinner" style={{ width: '24px', height: '24px', border: '2px solid var(--border-color)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <div>AI is analyzing workspace files...</div>
            <style>{`
                @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
      </div>
    );
  }

  return (
    <div className="architecture-graph-container">
      <div className="stats-panel">
        <div className="stat-item">
          <span className="stat-label">Nodes</span>
          <span className="stat-value">{nodes.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Links</span>
          <span className="stat-value">{edges.length}</span>
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        connectionLineType={ConnectionLineType.SmoothStep}
        colorMode="dark"
        fitView
      >
        <Panel position="top-right" style={{ display: 'flex', gap: '8px', zIndex: 10 }}>
          <button onClick={() => onLayout('TB')} style={{ background: '#222', border: '1px solid #444', color: '#fff', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>Vertical</button>
          <button onClick={() => onLayout('LR')} style={{ background: '#222', border: '1px solid #444', color: '#fff', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>Horizontal</button>
          <button onClick={fetchGraph} style={{ background: '#4a90e2', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>Refresh</button>
        </Panel>
        <Background color="#222" gap={16} />
        <Controls style={{ button: { background: '#111', border: '1px solid #333', color: '#fff' } }}/>
        <MiniMap 
          nodeColor={(node) => '#333'}
          maskColor="rgba(0, 0, 0, 0.7)"
          style={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
        />
      </ReactFlow>
    </div>
  );
};

export default ArchitectureGraph;
