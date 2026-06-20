import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Folder, File, Database, Globe, Layers, Component, Code } from 'lucide-react';

const getIconForType = (type, label) => {
  const lowerType = (type || '').toLowerCase();
  const lowerLabel = (label || '').toLowerCase();
  
  if (lowerType.includes('folder') || lowerLabel.includes('folder')) return <Folder size={18} />;
  if (lowerType.includes('database') || lowerLabel.includes('db') || lowerLabel.includes('model')) return <Database size={18} />;
  if (lowerType.includes('api') || lowerType.includes('route') || lowerLabel.includes('route')) return <Globe size={18} />;
  if (lowerType.includes('service') || lowerLabel.includes('service') || lowerLabel.includes('controller')) return <Layers size={18} />;
  if (lowerType.includes('component') || lowerLabel.includes('.jsx')) return <Component size={18} />;
  if (lowerLabel.endsWith('.css') || lowerLabel.endsWith('.scss')) return <Code size={18} />;
  return <File size={18} />; // default
};

const CustomNode = ({ data, targetPosition, sourcePosition }) => {
  const lowerType = (data.type || 'file').toLowerCase();
  const lowerLabel = (data.label || '').toLowerCase();
  
  let iconClass = 'file';
  if (lowerType.includes('folder')) iconClass = 'folder';
  else if (lowerType.includes('database') || lowerLabel.includes('db') || lowerLabel.includes('model')) iconClass = 'database';
  else if (lowerType.includes('api') || lowerType.includes('route') || lowerLabel.includes('route')) iconClass = 'api';
  else if (lowerType.includes('service') || lowerLabel.includes('service') || lowerLabel.includes('controller')) iconClass = 'service';
  else if (lowerType.includes('component') || lowerLabel.endsWith('.jsx')) iconClass = 'component';
  else if (lowerLabel.endsWith('.css') || lowerLabel.endsWith('.scss')) iconClass = 'css';
  else if (lowerLabel.endsWith('.js') || lowerLabel.endsWith('.ts')) iconClass = 'js';

  return (
    <div className="custom-node">
      <Handle type="target" position={targetPosition || Position.Top} />
      
      <div className={`icon-container ${iconClass}`}>
        {getIconForType(data.type, data.label)}
      </div>
      
      <div className="node-content">
        <div className="node-label">{data.label}</div>
        <div className="node-sublabel">{data.type || 'FILE'}</div>
      </div>
      
      <Handle type="source" position={sourcePosition || Position.Bottom} />
    </div>
  );
};

export default CustomNode;
