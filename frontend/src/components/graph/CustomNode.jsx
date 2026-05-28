import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Folder, File, Database, Globe, Layers, Component, Code } from 'lucide-react';

const getIconForType = (type) => {
  const lowerType = (type || '').toLowerCase();
  if (lowerType.includes('folder')) return <Folder />;
  if (lowerType.includes('database')) return <Database />;
  if (lowerType.includes('api') || lowerType.includes('route')) return <Globe />;
  if (lowerType.includes('service')) return <Layers />;
  if (lowerType.includes('component')) return <Component />;
  if (lowerType.includes('file')) return <File />;
  return <Code />; // default
};

const CustomNode = ({ data, targetPosition, sourcePosition }) => {
  const lowerType = (data.type || 'file').toLowerCase();
  
  let iconClass = 'default';
  if (lowerType.includes('folder')) iconClass = 'folder';
  else if (lowerType.includes('database')) iconClass = 'database';
  else if (lowerType.includes('api') || lowerType.includes('route')) iconClass = 'api';
  else if (lowerType.includes('service')) iconClass = 'service';
  else if (lowerType.includes('component')) iconClass = 'component';
  else if (lowerType.includes('file')) iconClass = 'file';

  return (
    <div className="custom-node">
      <Handle type="target" position={targetPosition || Position.Top} />
      
      <div className={`icon-container ${iconClass}`}>
        {getIconForType(data.type)}
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
