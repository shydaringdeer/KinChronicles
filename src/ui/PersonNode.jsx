import React, { memo, useContext } from 'react';
import { Handle, Position, NodeToolbar, useReactFlow } from '@xyflow/react';
import { TreeContext } from './TreeContext';

const handleStyle = {
  background: '#18181b',
  width: 12,
  height: 12,
  border: '2px solid #a1a1aa'
};

const btnStyle = {
  background: 'var(--surface-1)',
  color: 'var(--text-primary)',
  border: '1px solid var(--surface-border)',
  padding: '6px 12px',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '0.8rem',
  fontWeight: 600,
  boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
};

const PersonNode = ({ id, data, selected }) => {
  const { setNodes, setEdges, getNode } = useReactFlow();
  const { dynasties } = useContext(TreeContext);

  const dynasty = dynasties.find(d => d.id === data.dynastyId);

  const addParent = () => {
    const node = getNode(id);
    const newNodeId = Date.now().toString();
    const newNode = {
      id: newNodeId,
      type: 'person',
      position: { x: node.position.x, y: node.position.y - 200 },
      data: { firstName: 'New', lastName: 'Parent' },
    };
    setNodes((nds) => nds.concat(newNode));
    setEdges((eds) => eds.concat({
      id: `e-${newNodeId}-${id}`,
      source: newNodeId,
      sourceHandle: 'bottom',
      target: id,
      targetHandle: 'top',
      type: 'smoothstep',
      style: { stroke: 'var(--edge-child)', strokeWidth: 2 }
    }));
  };

  const addSpouse = () => {
    const node = getNode(id);
    const newNodeId = Date.now().toString();
    const newNode = {
      id: newNodeId,
      type: 'person',
      position: { x: node.position.x + 300, y: node.position.y },
      data: { firstName: 'New', lastName: 'Spouse' },
    };
    setNodes((nds) => nds.concat(newNode));
    setEdges((eds) => eds.concat({
      id: `e-${id}-${newNodeId}`,
      source: id,
      sourceHandle: 'right',
      target: newNodeId,
      targetHandle: 'left',
      type: 'smoothstep',
      style: { stroke: 'var(--edge-spouse)', strokeWidth: 2 }
    }));
  };

  const addChild = () => {
    const node = getNode(id);
    const newNodeId = Date.now().toString();
    const newNode = {
      id: newNodeId,
      type: 'person',
      position: { x: node.position.x, y: node.position.y + 200 },
      data: { 
        firstName: 'New', 
        lastName: node.data.lastName || 'Child',
        cadetBranch: node.data.cadetBranch || ''
      },
    };
    setNodes((nds) => nds.concat(newNode));
    setEdges((eds) => eds.concat({
      id: `e-${id}-${newNodeId}`,
      source: id,
      sourceHandle: 'bottom',
      target: newNodeId,
      targetHandle: 'top',
      type: 'smoothstep',
      style: { stroke: 'var(--edge-child)', strokeWidth: 2 }
    }));
  };

  return (
    <>
      <NodeToolbar isVisible={selected} position={Position.Top} style={{ display: 'flex', gap: '0.5rem' }}>
        <button onClick={addParent} style={btnStyle}>+ Parent</button>
        <button onClick={addSpouse} style={btnStyle}>+ Spouse</button>
        <button onClick={addChild} style={btnStyle}>+ Child</button>
      </NodeToolbar>

      <Handle type="target" position={Position.Top} id="top" style={handleStyle} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={handleStyle} />
      <Handle type="target" position={Position.Left} id="left" style={{ ...handleStyle, top: '50px' }} />
      <Handle type="source" position={Position.Right} id="right" style={{ ...handleStyle, top: '50px' }} />

      <div 
        style={{
          width: '200px',
          padding: '1rem',
          borderRadius: '12px',
          backgroundColor: data.gender === 'male' ? '#e0f2fe' : data.gender === 'female' ? '#fce7f3' : 'var(--node-bg)',
          color: 'var(--node-text)',
          border: selected ? '3px solid var(--node-border-active)' : 
                  data.gender === 'male' ? '3px solid #3b82f6' : 
                  data.gender === 'female' ? '3px solid #ec4899' : 
                  '3px solid var(--node-border)',
          boxShadow: 'var(--node-shadow)',
          textAlign: 'center',
          fontFamily: 'var(--font-body)',
          transition: 'all 0.2s ease-in-out',
          position: 'relative'
        }}
      >
        {dynasty?.coaUrl && (
          <div style={{ position: 'absolute', top: '-24px', left: '50%', transform: 'translateX(-50%)' }}>
            <img 
              src={dynasty.coaUrl} 
              alt="Coat of Arms" 
              crossOrigin="anonymous"
              style={{ width: '48px', height: '48px', objectFit: 'contain', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }} 
            />
          </div>
        )}
        
        {data.bio && (
          <div style={{ position: 'absolute', top: '8px', right: '8px', fontSize: '1.1rem' }} title="Has Biography">
            📜
          </div>
        )}

        {data.portraitUrl && (
          <img 
            src={data.portraitUrl}
            alt="Portrait"
            crossOrigin="anonymous"
            style={{
              width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover',
              border: '2px solid var(--surface-border)',
              margin: '8px auto 12px auto', display: 'block',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
          />
        )}
        
        <h3 style={{ margin: dynasty?.coaUrl && !data.portraitUrl ? '16px 0 0' : 0, fontSize: '1.1rem', fontWeight: 600 }}>
          {data.firstName || 'New'} {dynasty?.name || data.lastName || 'Person'}
        </h3>
        
        {(dynasty?.name || data.lastName) && (
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            House {dynasty?.name || data.lastName}
            {(dynasty?.branch || data.cadetBranch) && <span style={{display: 'block', fontSize: '0.75rem', fontStyle: 'italic'}}>{dynasty?.branch || data.cadetBranch} Branch</span>}
          </p>
        )}
        {!(dynasty?.name || data.lastName) && (
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Unknown House
          </p>
        )}

        {(data.birthYear || data.deathYear) && (
          <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#4b5563', fontWeight: 600 }}>
            {data.birthYear || '?'} - {data.deathYear || '?'}
          </p>
        )}

        {(data.reignStart || data.reignEnd) && (
          <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#fbbf24', fontWeight: 600 }}>
            👑 {data.reignStart || '?'} - {data.reignEnd || '?'}
          </p>
        )}
        
        {data.traits && (
          <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center' }}>
            {data.traits.split(',').map((trait, i) => {
              const trimmed = trait.trim();
              if (!trimmed) return null;
              return (
                <span key={i} style={{ 
                  background: 'var(--surface-border)', 
                  color: 'var(--text-primary)', 
                  fontSize: '0.7rem', 
                  padding: '2px 6px', 
                  borderRadius: '4px' 
                }}>
                  {trimmed}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default memo(PersonNode);
