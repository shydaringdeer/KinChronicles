import React, { useMemo, useState, useEffect } from 'react';
import { 
  ReactFlow, 
  MiniMap, 
  Controls, 
  Background,
  useNodesState,
  useEdgesState
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import PersonNode from './PersonNode';
import WaypointNode from './WaypointNode';
import DraggableEdge from './DraggableEdge';
import { loadTree } from '../state/db';
import { TreeContext } from './TreeContext';
import { useParams, useNavigate } from 'react-router-dom';

export default function TreeViewer() {
  const { treeId } = useParams();
  const navigate = useNavigate();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [dynasties, setDynasties] = useState([]);
  const [currentTreeName, setCurrentTreeName] = useState('Loading...');
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [error, setError] = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const fetchTree = async () => {
      try {
        const data = await loadTree(treeId); // No user ID, relies on is_public being true
        if (data && data.data && data.data.nodes) {
          // Lock all nodes from being draggable
          const lockedNodes = data.data.nodes.map(n => ({ ...n, draggable: false, selectable: false }));
          setNodes(lockedNodes);
          setEdges(data.data.edges || []);
          setDynasties(data.data.dynasties || []);
          setCurrentTreeName(data.name);
        } else {
          setError("Tree not found or is not public.");
        }
      } catch (err) {
        setError("Failed to load tree: " + err.message);
      }
    };
    if (treeId) fetchTree();
  }, [treeId, setNodes, setEdges]);

  const nodeTypes = useMemo(() => ({ person: PersonNode, waypoint: WaypointNode }), []);
  const edgeTypes = useMemo(() => ({ 
    action: DraggableEdge,
    smoothstep: DraggableEdge,
    smart: DraggableEdge,
    default: DraggableEdge
  }), []);

  if (error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '1rem', background: 'var(--bg-color)' }}>
        <h2 style={{ color: 'var(--text-primary)' }}>{error}</h2>
        <button onClick={() => navigate('/')} style={{ padding: '0.5rem 1rem', background: 'var(--accent-primary)', border: 'none', borderRadius: '8px', color: '#18181b', fontWeight: 600, cursor: 'pointer' }}>Go Home</button>
      </div>
    );
  }

  return (
    <TreeContext.Provider value={{ dynasties }}>
      <div style={{ width: '100vw', height: '100vh', background: 'var(--bg-color)', overflow: 'hidden' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
        >
          <Background color="var(--surface-border)" gap={24} />
          <Controls style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-border)', fill: 'var(--text-primary)' }} />
          <MiniMap 
            nodeColor={(n) => {
              if (n.type === 'waypoint') return 'transparent';
              return n.data?.gender === 'male' ? '#3b82f6' : n.data?.gender === 'female' ? '#ec4899' : '#8b5cf6';
            }}
            maskColor="rgba(0,0,0,0.2)"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-border)' }}
          />
        </ReactFlow>

        {/* Top Header */}
        <div style={{
          position: 'absolute', top: '24px', left: '24px', zIndex: 10,
          background: 'var(--surface-1)', padding: '1rem 1.5rem', borderRadius: '12px',
          border: '1px solid var(--surface-border)', boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
          display: 'flex', flexDirection: 'column', gap: '0.25rem'
        }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-primary)' }}>{currentTreeName}</h1>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Read-Only View • Made with KinChronicles</p>
        </div>

        {/* Top Right Controls */}
        <div style={{
          position: 'absolute', top: '24px', right: '24px', zIndex: 100,
          display: 'flex', gap: '0.75rem'
        }}>
          <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} style={{ padding: '0.5rem 1rem', background: 'var(--surface-1)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', cursor: 'pointer' }}>
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
          <button onClick={() => navigate('/')} style={{ padding: '0.5rem 1rem', background: 'var(--accent-primary)', border: 'none', borderRadius: '8px', color: '#18181b', fontWeight: 600, cursor: 'pointer' }}>
            Create Your Own Tree
          </button>
        </div>
      </div>
    </TreeContext.Provider>
  );
}
