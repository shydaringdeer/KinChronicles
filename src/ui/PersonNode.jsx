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

const toRoman = (num) => {
  if (isNaN(num) || num < 1 || num > 3999) return '';
  const roman = {
    M: 1000, CM: 900, D: 500, CD: 400,
    C: 100, XC: 90, L: 50, XL: 40,
    X: 10, IX: 9, V: 5, IV: 4, I: 1
  };
  let str = '';
  let n = parseInt(num);
  for (let i of Object.keys(roman)) {
    let q = Math.floor(n / roman[i]);
    n -= q * roman[i];
    str += i.repeat(q);
  }
  return str;
};

const PersonNode = ({ id, data, selected }) => {
  const { setNodes, setEdges, getNode } = useReactFlow();
  const { dynasties, baseCalendarId, userCalendars } = useContext(TreeContext);

  const dynasty = dynasties?.find(d => d.id === data.dynastyId);
  const baseCalendar = userCalendars?.find(c => c.id === baseCalendarId);
  const months = baseCalendar?.data?.months || [];

  const getOrdinal = (n) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const formatDate = (structDate, fallbackStr) => {
    if (baseCalendarId && structDate && structDate.year !== undefined) {
      const m = months.find(x => x.id.toString() === structDate.monthId);
      const monthStr = m ? m.name : '';
      const dayStr = structDate.day ? getOrdinal(structDate.day) + ' of ' : '';
      return `${dayStr}${monthStr} ${structDate.year}`.trim();
    }
    return fallbackStr;
  };

  const hasStructBirth = baseCalendarId && data.structuredBirthDate && data.structuredBirthDate.year !== undefined && data.structuredBirthDate.year !== '';
  const hasStructDeath = baseCalendarId && data.structuredDeathDate && data.structuredDeathDate.year !== undefined && data.structuredDeathDate.year !== '';
  const bYear = hasStructBirth ? parseInt(data.structuredBirthDate.year) : parseInt(data.birthYear);
  const dYear = hasStructDeath ? parseInt(data.structuredDeathDate.year) : parseInt(data.deathYear);

  let ageString = '';
  const formattedBirth = formatDate(data.structuredBirthDate, data.birthYear);
  const formattedDeath = formatDate(data.structuredDeathDate, data.deathYear);

  if (!isNaN(bYear) && !isNaN(dYear)) {
    ageString = `${formattedBirth} - ${formattedDeath} (Age ${dYear - bYear})`;
  } else if (formattedBirth && !isNaN(bYear)) {
    ageString = `b. ${formattedBirth}`;
  } else if (formattedDeath && !isNaN(dYear)) {
    ageString = `d. ${formattedDeath}`;
  }

  const formattedReignStart = formatDate(data.structuredReignStart, data.reignStart);
  const formattedReignEnd = formatDate(data.structuredReignEnd, data.reignEnd);

  const colorMap = {
    default: 'var(--surface-border)',
    gold: '#fbbf24',
    crimson: '#ef4444',
    violet: '#8b5cf6',
    emerald: '#10b981'
  };
  
  const customColor = data.cardColor && colorMap[data.cardColor] ? colorMap[data.cardColor] : null;
  const borderColor = customColor || (selected ? 'var(--edge-child)' : 'var(--surface-border)');
  const borderWidth = customColor || selected ? '2px' : '1px';
  const boxShadow = customColor ? `0 0 15px ${customColor}40` : (selected ? '0 0 0 4px rgba(59, 130, 246, 0.3)' : '0 4px 6px rgba(0,0,0,0.1)');

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
          backgroundColor: data.gender === 'male' ? '#bfdbfe' : data.gender === 'female' ? '#fbcfe8' : '#ffffff',
          color: 'var(--node-text)',
          border: `${borderWidth} solid ${borderColor}`,
          boxShadow: boxShadow,
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
          {data.firstName || 'New'} {data.regnalNumber ? toRoman(data.regnalNumber) + ' ' : ''}{dynasty?.name || data.lastName || 'Person'}
        </h3>
        
        {(dynasty?.name || data.lastName) && (
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            House {dynasty?.name || data.lastName}
            {(dynasty?.branch || data.cadetBranch) && <span style={{display: 'block', fontSize: '0.75rem', fontStyle: 'italic'}}>{dynasty?.branch || data.cadetBranch} Branch</span>}
          </p>
        )}

        {ageString && (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem', background: 'var(--surface-1)', padding: '2px 8px', borderRadius: '12px', display: 'inline-block' }}>
            {ageString}
          </div>
        )}

        {!(dynasty?.name || data.lastName) && (
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Unknown House
          </p>
        )}

        {(formattedReignStart || formattedReignEnd) && (
          <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#fbbf24', fontWeight: 600 }}>
            👑 {formattedReignStart || '?'} - {formattedReignEnd || '?'}
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
