import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

const centerStyle = {
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  opacity: 0,
  width: 1,
  height: 1
};

const WaypointNode = () => {
  return (
    <div 
      style={{ 
        width: 16, 
        height: 16, 
        borderRadius: '50%', 
        backgroundColor: 'var(--text-muted)', 
        border: '2px solid var(--surface-1)',
        cursor: 'grab',
        boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
      }}
      title="Drag to route line"
    >
      <Handle type="target" position={Position.Top} id="target" style={centerStyle} isConnectable={false} />
      <Handle type="source" position={Position.Bottom} id="source" style={centerStyle} isConnectable={false} />
    </div>
  );
};

export default memo(WaypointNode);
