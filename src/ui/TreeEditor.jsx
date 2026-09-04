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
import { saveTree, loadTree, shareTree } from '../state/db';
import TreeListModal from './TreeListModal';
import { TreeContext } from './TreeContext';
import { getLayoutedElements } from '../utils/layout';

const initialNodes = [
  { id: '1', type: 'person', position: { x: 250, y: 150 }, data: { firstName: 'Root', lastName: 'Character', dynasty: 'Origin' } }
];
const initialEdges = [];

export default function TreeEditor() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [dynasties, setDynasties] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isTreeListOpen, setIsTreeListOpen] = useState(false);
  const [currentTreeId, setCurrentTreeId] = useState(null);
  const [currentTreeName, setCurrentTreeName] = useState('Untitled Tree');
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [rfInstance, setRfInstance] = useState(null);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDynastyId, setFilterDynastyId] = useState('');
  
  // Theme State
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user || null);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const handleNewTree = () => {
    if (window.confirm("Start a new family tree? Make sure your current one is saved!")) {
      setNodes(initialNodes);
      setEdges(initialEdges);
      setDynasties([]);
      setCurrentTreeId(null);
      setCurrentTreeName('Untitled Tree');
    }
  };

  const handleSelectTree = async (id, name) => {
    try {
      const data = await loadTree(id, currentUser.id);
      if (data && data.data && data.data.nodes) {
        setNodes(data.data.nodes);
        setEdges(data.data.edges || []);
        setDynasties(data.data.dynasties || []);
        setCurrentTreeId(id);
        setCurrentTreeName(name);
        setIsTreeListOpen(false);
      }
    } catch (err) {
      alert("Failed to load tree: " + err.message);
    }
  };

  const handleSave = async () => {
    if (!currentUser) {
      return alert("You must be logged in to save to the cloud.");
    }
    
    let nameToSave = currentTreeName;
    if (!currentTreeId) {
      const inputName = prompt("Enter a name for this family tree:", currentTreeName);
      if (!inputName) return; // cancelled
      nameToSave = inputName;
    }

    setIsSaving(true);
    try {
      const savedTree = await saveTree(currentUser.id, currentTreeId, nameToSave, nodes, edges, dynasties);
      setCurrentTreeId(savedTree.id);
      setCurrentTreeName(savedTree.name);
      alert("Tree saved successfully!");
    } catch (err) {
      alert("Failed to save to cloud: " + (err.message || JSON.stringify(err)));
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    if (!currentTreeId || !currentUser) {
      alert("Please save your tree to the cloud first before sharing.");
      return;
    }
    try {
      await shareTree(currentTreeId, currentUser.id);
      const url = `${window.location.origin}/#/view/${currentTreeId}`;
      prompt("Your tree is now public! Copy this link to share:", url);
    } catch (err) {
      alert("Failed to share tree: " + (err.message || JSON.stringify(err)));
    }
  };

  const handleAutoLayout = useCallback(() => {
    const { layoutedNodes, layoutedEdges } = getLayoutedElements(nodes, edges);
    setNodes([...layoutedNodes]);
    setEdges([...layoutedEdges]);
    setTimeout(() => rfInstance?.fitView({ duration: 800 }), 100);
  }, [nodes, edges, setNodes, setEdges, rfInstance]);

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
        data: { relationType: isSpouse ? 'married' : 'biological' }
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

  const onUpdateEdge = useCallback((id, newData) => {
    setEdges((eds) =>
      eds.map((edge) => {
        if (edge.id === id) {
          return {
            ...edge,
            data: { ...edge.data, ...newData },
          };
        }
        return edge;
      })
    );
  }, [setEdges]);

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
        setDynasties(data.dynasties || []);
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
          setDynasties(data.dynasties || []);
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

  const handleGoToCharacter = (node) => {
    if (rfInstance) {
      rfInstance.setCenter(node.position.x, node.position.y, { zoom: 1, duration: 800 });
      setSelectedNodeId(node.id);
      setSelectedEdgeId(null);
      setSearchQuery('');
    }
  };

  const matchingCharacters = useMemo(() => {
    if (!searchQuery) return [];
    return nodes.filter(n => {
      if (n.type !== 'person') return false;
      const dyn = dynasties.find(d => d.id === n.data.dynastyId);
      const houseName = dyn?.name || n.data.lastName || '';
      const fullName = `${n.data.firstName || ''} ${houseName}`.toLowerCase();
      
      const matchesSearch = fullName.includes(searchQuery.toLowerCase());
      const matchesFilter = filterDynastyId === '' || n.data.dynastyId === filterDynastyId;
      
      return matchesSearch && matchesFilter;
    }).slice(0, 5);
  }, [nodes, searchQuery, filterDynastyId, dynasties]);

  // Relationship Highlighting logic
  const { highlightedNodeIds, highlightedEdgeIds } = useMemo(() => {
    const defaultRes = { highlightedNodeIds: null, highlightedEdgeIds: null };
    if (!selectedNodeId) return defaultRes;
    
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const visitedNodes = new Set();
    const visitedEdges = new Set();
    
    const queue = [selectedNodeId];
    visitedNodes.add(selectedNodeId);
    
    while (queue.length > 0) {
      const currId = queue.shift();
      const currNode = nodeMap.get(currId);
      if (!currNode) continue;
      
      if (currNode.type === 'person' && currId !== selectedNodeId) {
        continue; // stop traversing past immediate relatives
      }
      
      edges.forEach(e => {
        if (e.source === currId || e.target === currId) {
          visitedEdges.add(e.id);
          const nextId = e.source === currId ? e.target : e.source;
          if (!visitedNodes.has(nextId)) {
            visitedNodes.add(nextId);
            queue.push(nextId);
          }
        }
      });
    }
    
    return { highlightedNodeIds: visitedNodes, highlightedEdgeIds: visitedEdges };
  }, [nodes, edges, selectedNodeId]);

  const displayNodes = useMemo(() => {
    return nodes.map(n => {
      let isVisible = true;
      
      // If a node is selected, we only show its relations.
      if (selectedNodeId) {
        isVisible = highlightedNodeIds ? highlightedNodeIds.has(n.id) : true;
      } 
      // Otherwise, if there is a search or filter, we use that.
      else if (n.type === 'person') {
        const query = searchQuery.toLowerCase();
        
        // We want to check dynasty.name too if they use it
        const dyn = dynasties.find(d => d.id === n.data.dynastyId);
        const houseName = dyn?.name || n.data.lastName || '';
        const fullName = `${n.data.firstName || ''} ${houseName}`.toLowerCase();
        
        const matchesSearch = query === '' || fullName.includes(query);
        const matchesFilter = filterDynastyId === '' || n.data.dynastyId === filterDynastyId;
        
        isVisible = matchesSearch && matchesFilter;
      }
      
      return {
        ...n,
        style: { ...n.style, opacity: isVisible ? 1 : 0.1, pointerEvents: isVisible ? 'all' : 'none', transition: 'opacity 0.2s' }
      };
    });
  }, [nodes, highlightedNodeIds, selectedNodeId, searchQuery, filterDynastyId, dynasties]);

  const displayEdges = useMemo(() => {
    return edges.map(e => {
      const isSpouse = e.sourceHandle === 'right' || e.targetHandle === 'left';
      const relType = e.data?.relationType || (isSpouse ? 'married' : 'biological');
      
      let strokeColor = isSpouse ? 'var(--edge-spouse)' : 'var(--edge-child)';
      let dashArray = 'none';

      // Advanced Relationship Types
      if (relType === 'adopted' || relType === 'betrothed') {
        dashArray = '10, 8'; // Long dashes
      } else if (relType === 'illegitimate' || relType === 'lovers') {
        dashArray = '2, 8'; // Distinct dots
      }

      const isHighlighted = highlightedEdgeIds ? highlightedEdgeIds.has(e.id) : true;

      return {
        ...e,
        style: { 
          ...e.style, 
          stroke: strokeColor,
          strokeWidth: 2,
          strokeDasharray: dashArray,
          opacity: isHighlighted ? 1 : 0.1, 
          transition: 'opacity 0.2s' 
        }
      };
    });
  }, [edges, highlightedEdgeIds]);

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
    <TreeContext.Provider value={{ dynasties, setDynasties }}>
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
        onUpdateEdge={onUpdateEdge}
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
          dynasties={dynasties}
          onClose={() => setIsExportModalOpen(false)} 
        />
      )}

      {isTreeListOpen && currentUser && (
        <TreeListModal
          currentUser={currentUser}
          onClose={() => setIsTreeListOpen(false)}
          onSelect={handleSelectTree}
        />
      )}

      <div 
        style={{
          position: 'absolute',
          bottom: '24px',
          right: (selectedNode || selectedEdge) ? '344px' : '24px', 
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

      {/* Top Center: Tree Name & Search */}
      <div style={{
        position: 'absolute',
        top: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.75rem',
        zIndex: 40
      }}>
        <div style={{
          background: 'var(--surface-1)',
          padding: '0.5rem 1.5rem',
          borderRadius: '12px',
          border: '1px solid var(--surface-border)',
          boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
          fontWeight: 'bold',
          fontSize: '1.2rem',
          color: 'var(--text-primary)'
        }}>
          {currentTreeName}
        </div>
        
        <div style={{ position: 'relative' }}>
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            background: 'var(--surface-1)',
            padding: '0.5rem',
            borderRadius: '12px',
            border: '1px solid var(--surface-border)',
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
          }}>
            <input 
              type="text"
              placeholder="Search characters..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                padding: '0.5rem',
                borderRadius: '8px',
                border: '1px solid var(--surface-border)',
                background: 'var(--bg-color)',
                color: 'var(--text-primary)',
                minWidth: '200px'
              }}
            />
            <select
              value={filterDynastyId}
              onChange={e => setFilterDynastyId(e.target.value)}
              style={{
                padding: '0.5rem',
                borderRadius: '8px',
                border: '1px solid var(--surface-border)',
                background: 'var(--bg-color)',
                color: 'var(--text-primary)'
              }}
            >
              <option value="">All Houses</option>
              {dynasties.map(d => (
                <option key={d.id} value={d.id}>{d.name} {d.branch ? `(${d.branch})` : ''}</option>
              ))}
            </select>
          </div>
          
          {searchQuery && matchingCharacters.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '0.5rem',
              background: 'var(--surface-1)', borderRadius: '12px', border: '1px solid var(--surface-border)',
              boxShadow: '0 4px 6px rgba(0,0,0,0.3)', overflow: 'hidden'
            }}>
              {matchingCharacters.map(c => {
                const dyn = dynasties.find(d => d.id === c.data.dynastyId);
                const houseName = dyn?.name || c.data.lastName || '';
                return (
                  <div 
                    key={c.id} 
                    onClick={() => handleGoToCharacter(c)}
                    style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid var(--surface-border)', color: 'var(--text-primary)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    🔍 {c.data.firstName} {houseName}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Save & Auth Buttons (Top Right) */}
      <div style={{
        position: 'absolute',
        top: '24px',
        right: (selectedNode || selectedEdge) ? '344px' : '24px',
        zIndex: 100,
        transition: 'right 0.2s ease-in-out',
        display: 'flex',
        gap: '0.5rem',
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
        maxWidth: (selectedNode || selectedEdge) ? 'calc(100vw - 680px)' : 'calc(100vw - 360px)'
      }}>
        {currentUser ? (
          <>
            <button onClick={handleNewTree} style={btnStyle}>New Tree</button>
            <button onClick={() => setIsTreeListOpen(true)} style={btnStyle}>My Trees</button>
            <button 
              onClick={async () => { await logout(); navigate('/login'); }} 
              style={{...btnStyle, color: '#ef4444'}}
            >
              Logout
            </button>
          </>
        ) : (
          <button 
            onClick={() => navigate('/login')} 
            style={btnStyle}
          >
            Login / Signup
          </button>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} style={{ padding: '0.5rem 1rem', background: 'var(--surface-1)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', cursor: 'pointer' }}>
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
          <button onClick={handleAutoLayout} style={{ padding: '0.5rem 1rem', background: 'var(--surface-1)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', cursor: 'pointer' }}>
            🪄 Auto-Layout
          </button>
          <button onClick={() => setIsExportModalOpen(true)} style={{ padding: '0.5rem 1rem', background: 'var(--surface-1)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', cursor: 'pointer' }}>
            🖼️ Export
          </button>
          <button onClick={handleShare} style={{ padding: '0.5rem 1rem', background: 'var(--surface-1)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', cursor: 'pointer' }}>
            🔗 Share
          </button>
          <button onClick={handleSave} disabled={isSaving} style={{ padding: '0.5rem 1rem', background: 'var(--accent-primary)', border: 'none', borderRadius: '8px', color: '#18181b', fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer' }}>
            {isSaving ? 'Saving...' : '☁️ Save'}
          </button>
        </div>
      </div>
    </div>
    </TreeContext.Provider>
  );
}
