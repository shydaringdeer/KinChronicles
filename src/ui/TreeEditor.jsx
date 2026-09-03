import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { 
  ReactFlow, 
  MiniMap, 
  Controls, 
  Background,
  useNodesState,
  useEdgesState,
  addEdge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import PersonNode from './PersonNode';
import InspectorPanel from './InspectorPanel';
import { useNavigate } from 'react-router-dom';
import ExportModal from './ExportModal';
import WaypointNode from './WaypointNode';
import DraggableEdge from './DraggableEdge';
import { supabase, logout } from '../state/supabase';
import { saveTree, loadTree } from '../state/db';

const initialNodes = [
  { id: '1', type: 'person', position: { x: 250, y: 150 }, data: { firstName: 'Root', lastName: 'Character', dynasty: 'Origin' } }
];
const initialEdges = [];

export default function TreeEditor() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [rfInstance, setRfInstance] = useState(null);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user || null;
      setCurrentUser(user);
      if (user) {
        loadTree(user.id).then(data => {
          if (data && data.nodes && data.nodes.length > 0) {
            setNodes(data.nodes);
            setEdges(data.edges);
          }
        }).catch(err => console.error("Failed to load cloud save", err));
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user || null;
      setCurrentUser(user);
      if (user) {
        loadTree(user.id).then(data => {
          if (data && data.nodes && data.nodes.length > 0) {
            setNodes(data.nodes);
            setEdges(data.edges);
          }
        }).catch(err => console.error("Failed to load cloud save", err));
      }
    });
    
    return () => subscription.unsubscribe();
  }, [setNodes, setEdges]);

  const handleSave = async () => {
    if (!currentUser) {
      return alert("You must be logged in to save to the cloud.");
    }
    setIsSaving(true);
    try {
      await saveTree(currentUser.id, nodes, edges);
      alert("Tree saved successfully!");
    } catch (err) {
      alert("Failed to save to cloud: " + (err.message || JSON.stringify(err)));
    } finally {
      setIsSaving(false);
    }
  };

  const nodeTypes = useMemo(() => ({ person: PersonNode, waypoint: WaypointNode }), []);
  const edgeTypes = useMemo(() => ({ 
    action: DraggableEdge,
    smoothstep: DraggableEdge,
    smart: DraggableEdge,
    default: DraggableEdge
  }), []);

  const onConnect = useCallback(
    (params) => {
      const isSpouse = params.sourceHandle === 'right' || params.targetHandle === 'left';
      
      const edge = {
        ...params,
        type: 'smoothstep',
        style: isSpouse 
          ? { stroke: 'var(--edge-spouse)', strokeWidth: 2 } 
          : { stroke: 'var(--edge-child)', strokeWidth: 2 }
      };

      setEdges((eds) => addEdge(edge, eds));
    },
    [setEdges],
  );

  const onNodeClick = useCallback((event, node) => {
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }, []);

  const onEdgeClick = useCallback((event, edge) => {
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
  }, []);

  const onEdgeDoubleClick = useCallback((event, edge) => {
    if (!rfInstance) return;
    
    const position = rfInstance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    
    const waypointId = `wp-${Date.now()}`;
    const waypointNode = {
      id: waypointId,
      type: 'waypoint',
      position,
      data: {}
    };
    
    const newEdge1 = {
      id: `e-${edge.source}-${waypointId}`,
      source: edge.source,
      sourceHandle: edge.sourceHandle,
      target: waypointId,
      targetHandle: 'target',
      type: 'smoothstep',
      style: edge.style
    };
    
    const newEdge2 = {
      id: `e-${waypointId}-${edge.target}`,
      source: waypointId,
      sourceHandle: 'source',
      target: edge.target,
      targetHandle: edge.targetHandle,
      type: 'smoothstep',
      style: edge.style
    };
    
    setNodes((nds) => nds.concat(waypointNode));
    setEdges((eds) => eds.filter((e) => e.id !== edge.id).concat(newEdge1, newEdge2));
    setSelectedEdgeId(null);
  }, [rfInstance, setNodes, setEdges]);

  const onUpdateNode = useCallback((id, newData) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: { ...node.data, ...newData },
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  const onDeleteNode = useCallback((id) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    setSelectedNodeId(null);
  }, [setNodes, setEdges]);

  const onDeleteEdge = useCallback((id) => {
    setEdges((eds) => eds.filter((e) => e.id !== id));
    setSelectedEdgeId(null);
  }, [setEdges]);

  const addNode = () => {
    const newNode = {
      id: `${Date.now()}`,
      type: 'person',
      position: { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
      data: { firstName: 'New', lastName: 'Character' },
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const handleFallbackImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.nodes && data.edges) {
        const cleanedEdges = data.edges.map(e => ({
          ...e,
          type: 'smoothstep'
        }));
        setNodes(data.nodes);
        setEdges(cleanedEdges);
        alert("Family tree imported successfully!");
      } else {
        alert("Invalid save file format.");
      }
    } catch (err) {
      alert("Failed to read the file. Make sure it's a valid JSON.");
      console.error("Failed to parse JSON", err);
    }
    
    event.target.value = '';
  };

  const onImportJson = useCallback(async () => {
    try {
      if (window.showOpenFilePicker) {
        const [fileHandle] = await window.showOpenFilePicker({
          types: [{
            description: 'JSON File',
            accept: { 'application/json': ['.json'] },
          }],
          multiple: false
        });
        const file = await fileHandle.getFile();
        const text = await file.text();
        const data = JSON.parse(text);
        
        if (data.nodes && data.edges) {
          const cleanedEdges = data.edges.map(e => ({
            ...e,
            type: 'smoothstep'
          }));
          setNodes(data.nodes);
          setEdges(cleanedEdges);
          alert("Family tree imported successfully!");
        } else {
          alert("Invalid save file format.");
        }
      } else {
        fileInputRef.current?.click();
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        alert("Failed to import file: " + err.message);
      }
    }
  }, [setNodes, setEdges]);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const selectedEdge = edges.find(e => e.id === selectedEdgeId);

  // Relationship Highlighting logic
  const displayNodes = useMemo(() => {
    if (!selectedNodeId) return nodes;
    const relatedIds = new Set([selectedNodeId]);
    edges.forEach(e => {
      if (e.source === selectedNodeId) relatedIds.add(e.target);
      if (e.target === selectedNodeId) relatedIds.add(e.source);
    });
    return nodes.map(n => ({
      ...n,
      style: { ...n.style, opacity: relatedIds.has(n.id) ? 1 : 0.2, transition: 'opacity 0.2s' }
    }));
  }, [nodes, edges, selectedNodeId]);

  const displayEdges = useMemo(() => {
    if (!selectedNodeId) return edges;
    return edges.map(e => ({
      ...e,
      style: { ...e.style, opacity: (e.source === selectedNodeId || e.target === selectedNodeId) ? 1 : 0.1, transition: 'opacity 0.2s' }
    }));
  }, [edges, selectedNodeId]);

  // House Summary Stats
  const houseStats = useMemo(() => {
    const stats = {};
    nodes.forEach(n => {
      if (n.type !== 'person') return;
      const house = n.data.lastName || 'Unknown House';
      const branch = n.data.cadetBranch;
      const key = branch ? `${house} (Branch: ${branch})` : house;
      stats[key] = (stats[key] || 0) + 1;
    });
    return Object.entries(stats).sort((a, b) => b[1] - a[1]);
  }, [nodes]);

  const btnStyle = {
    padding: '0.75rem 1.25rem',
    background: 'var(--surface-1)',
    color: 'var(--text-primary)',
    border: '1px solid var(--surface-border)',
    fontWeight: 600,
    borderRadius: '12px',
    cursor: 'pointer'
  };

  const primaryBtnStyle = {
    ...btnStyle,
    background: 'var(--text-primary)',
    color: 'var(--bg-color)',
    boxShadow: 'var(--node-shadow)'
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onEdgeClick={onEdgeClick}
        onEdgeDoubleClick={onEdgeDoubleClick}
        onInit={setRfInstance}
        fitView
      >
        <Background color="#3f3f46" gap={40} size={1.5} variant="dots" />
        <Controls style={{ background: '#18181b', border: '1px solid #52525b', fill: '#f4f4f5', color: '#f4f4f5' }} />
        <MiniMap 
          position="bottom-left"
          style={{ background: '#18181b', border: '1px solid #52525b' }}
          nodeColor="var(--node-bg)"
          maskColor="rgba(0,0,0,0.4)"
        />
      </ReactFlow>

      <InspectorPanel 
        selectedNode={selectedNode} 
        selectedEdge={selectedEdge}
        onUpdateNode={onUpdateNode} 
        onDeleteNode={onDeleteNode}
        onDeleteEdge={onDeleteEdge}
        onClose={() => {
          setSelectedNodeId(null);
          setSelectedEdgeId(null);
        }} 
      />

      {isExportModalOpen && (
        <ExportModal 
          nodes={nodes} 
          edges={edges} 
          onClose={() => setIsExportModalOpen(false)} 
        />
      )}

      <div 
        style={{
          position: 'absolute',
          bottom: '24px',
          right: selectedNode ? '344px' : '24px', 
          display: 'flex',
          gap: '1rem',
          zIndex: 100,
          transition: 'right 0.2s ease-in-out'
        }}
      >
        <button onClick={() => navigate('/')} style={btnStyle}>Exit</button>
        <button onClick={() => setIsExportModalOpen(true)} style={btnStyle}>Export</button>
        <button onClick={onImportJson} style={btnStyle}>Import JSON</button>
        <input 
          type="file" 
          accept=".json" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={handleFallbackImport} 
        />
        <button onClick={addNode} style={primaryBtnStyle}>Add Node</button>
      </div>

      {/* House Summary Panel (Top Left) */}
      <div style={{
        position: 'absolute',
        top: '24px',
        left: '24px',
        background: 'var(--surface-1)',
        padding: '1rem',
        borderRadius: '12px',
        border: '1px solid var(--surface-border)',
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
        zIndex: 40,
        minWidth: '200px',
        maxHeight: '300px',
        overflowY: 'auto'
      }}>
        <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', color: 'var(--text-primary)' }}>Dynasties</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {houseStats.map(([house, count]) => (
            <div key={house} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>{house}</span>
              <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{count}</span>
            </div>
          ))}
          {houseStats.length === 0 && <span style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>No characters yet.</span>}
        </div>
      </div>

      {/* Save & Auth Buttons (Top Right) */}
      <div style={{
        position: 'absolute',
        top: '24px',
        right: selectedNode ? '344px' : '24px',
        zIndex: 100,
        transition: 'right 0.2s ease-in-out',
        display: 'flex',
        gap: '0.5rem'
      }}>
        {currentUser ? (
          <button 
            onClick={async () => { await logout(); navigate('/login'); }} 
            style={{...btnStyle, color: '#ef4444'}}
          >
            Logout ({currentUser.email || 'User'})
          </button>
        ) : (
          <button 
            onClick={() => navigate('/login')} 
            style={btnStyle}
          >
            Login / Signup
          </button>
        )}

        <button 
          onClick={handleSave} 
          disabled={isSaving}
          style={{
            ...primaryBtnStyle,
            background: isSaving ? 'var(--surface-border)' : '#10b981', // green shade
            opacity: isSaving ? 0.7 : 1
          }}
        >
          {isSaving ? 'Saving...' : '💾 Save to Cloud'}
        </button>
      </div>
    </div>
  );
}
