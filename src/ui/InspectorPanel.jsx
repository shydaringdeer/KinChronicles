import React from 'react';

export default function InspectorPanel({ selectedNode, selectedEdge, onUpdateNode, onDeleteNode, onDeleteEdge, onClose }) {
  if (!selectedNode && !selectedEdge) return null;

  if (selectedEdge) {
    return (
      <div 
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '320px',
          height: '100%',
          backgroundColor: 'var(--surface-1)',
          borderLeft: '1px solid var(--surface-border)',
          boxShadow: '-4px 0 15px rgba(0,0,0,0.3)',
          zIndex: 50,
          padding: '2rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          overflowY: 'auto'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Line Settings</h2>
          <button 
            onClick={onClose}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--text-muted)', 
              cursor: 'pointer',
              fontSize: '1.2rem'
            }}
          >
            ✕
          </button>
        </div>
        <p style={{ color: 'var(--text-muted)', lineHeight: '1.5' }}>
          You can double-click anywhere on this line on the canvas to instantly add a draggable waypoint!
        </p>
        <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
          <button
            onClick={() => onDeleteEdge(selectedEdge.id)}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
          >
            Delete Line
          </button>
        </div>
      </div>
    );
  }

  if (selectedNode.type === 'waypoint') {
    return (
      <div 
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '320px',
          height: '100%',
          backgroundColor: 'var(--surface-1)',
          borderLeft: '1px solid var(--surface-border)',
          boxShadow: '-4px 0 15px rgba(0,0,0,0.3)',
          zIndex: 50,
          padding: '2rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          overflowY: 'auto'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Waypoint</h2>
          <button 
            onClick={onClose}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--text-muted)', 
              cursor: 'pointer',
              fontSize: '1.2rem'
            }}
          >
            ✕
          </button>
        </div>
        <p style={{ color: 'var(--text-muted)', lineHeight: '1.5' }}>
          Drag this waypoint on the canvas to manually route lines around characters.
        </p>
        <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
          <button
            onClick={() => onDeleteNode(selectedNode.id)}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
          >
            Delete Waypoint
          </button>
        </div>
      </div>
    );
  }

  const data = selectedNode.data || {};

  const handleChange = (e) => {
    const { name, value } = e.target;
    onUpdateNode(selectedNode.id, { [name]: value });
  };

  return (
    <div 
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: '320px',
        height: '100%',
        backgroundColor: 'var(--surface-1)',
        borderLeft: '1px solid var(--surface-border)',
        boxShadow: '-4px 0 15px rgba(0,0,0,0.3)',
        zIndex: 50,
        padding: '2rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        overflowY: 'auto'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Edit Character</h2>
        <button 
          onClick={onClose}
          style={{ 
            background: 'transparent', 
            border: 'none', 
            color: 'var(--text-muted)', 
            cursor: 'pointer',
            fontSize: '1.2rem'
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>First Name</label>
        <input 
          type="text" 
          name="firstName"
          value={data.firstName || ''} 
          onChange={handleChange}
          style={{
            padding: '0.75rem',
            borderRadius: '8px',
            backgroundColor: 'var(--bg-color)',
            border: '1px solid var(--surface-border)',
            color: 'var(--text-primary)',
            fontSize: '1rem',
            fontFamily: 'var(--font-body)'
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>House / Dynasty</label>
        <input 
          type="text" 
          name="lastName"
          value={data.lastName || ''} 
          onChange={handleChange}
          style={{
            padding: '0.75rem',
            borderRadius: '8px',
            backgroundColor: 'var(--bg-color)',
            border: '1px solid var(--surface-border)',
            color: 'var(--text-primary)',
            fontSize: '1rem',
            fontFamily: 'var(--font-body)'
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>Gender</label>
        <select 
          name="gender"
          value={data.gender || 'unknown'} 
          onChange={handleChange}
          style={{
            padding: '0.75rem',
            borderRadius: '8px',
            backgroundColor: 'var(--bg-color)',
            border: '1px solid var(--surface-border)',
            color: 'var(--text-primary)',
            fontSize: '1rem',
            fontFamily: 'var(--font-body)'
          }}
        >
          <option value="unknown">Unknown</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
      </div>

      {data.lastName && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>Cadet Branch (Sub-house)</label>
          <input 
            type="text" 
            name="cadetBranch"
            value={data.cadetBranch || ''} 
            onChange={handleChange}
            placeholder="e.g. York"
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-color)',
              border: '1px solid var(--surface-border)',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              fontFamily: 'var(--font-body)'
            }}
          />
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>Birth Year</label>
          <input 
            type="text" 
            name="birthYear"
            value={data.birthYear || ''} 
            onChange={handleChange}
            placeholder="e.g. 1066"
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-color)',
              border: '1px solid var(--surface-border)',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              fontFamily: 'var(--font-body)'
            }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>Death Year</label>
          <input 
            type="text" 
            name="deathYear"
            value={data.deathYear || ''} 
            onChange={handleChange}
            placeholder="e.g. 1100"
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-color)',
              border: '1px solid var(--surface-border)',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              fontFamily: 'var(--font-body)'
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>Reign Start</label>
          <input 
            type="text" 
            name="reignStart"
            value={data.reignStart || ''} 
            onChange={handleChange}
            placeholder="e.g. 1080"
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-color)',
              border: '1px solid var(--surface-border)',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              fontFamily: 'var(--font-body)'
            }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>Reign End</label>
          <input 
            type="text" 
            name="reignEnd"
            value={data.reignEnd || ''} 
            onChange={handleChange}
            placeholder="e.g. 1100"
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-color)',
              border: '1px solid var(--surface-border)',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              fontFamily: 'var(--font-body)'
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>Traits (comma separated)</label>
        <textarea 
          name="traits"
          value={data.traits || ''} 
          onChange={handleChange}
          rows={3}
          style={{
            padding: '0.75rem',
            borderRadius: '8px',
            backgroundColor: 'var(--bg-color)',
            border: '1px solid var(--surface-border)',
            color: 'var(--text-primary)',
            fontSize: '1rem',
            fontFamily: 'var(--font-body)',
            resize: 'vertical'
          }}
          placeholder="e.g. Brave, Stubborn, Ambitious"
        />
      </div>
      
      <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
        <button
          onClick={() => onDeleteNode(selectedNode.id)}
          style={{
            width: '100%',
            padding: '0.75rem',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'}
          onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
        >
          Delete Character
        </button>
      </div>
    </div>
  );
}
