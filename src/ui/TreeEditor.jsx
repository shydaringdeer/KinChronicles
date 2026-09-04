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
import { supabase, logout, getUserProfile } from '../state/supabase';
import { saveTree, loadTree, shareTree } from '../state/db';
import TreeListModal from './TreeListModal';
import PricingModal from './PricingModal';
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

  // Subscription State
  const [subscriptionTier, setSubscriptionTier] = useState('free');
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);

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

  useEffect(() => {
    if (currentUser) {
      getUserProfile(currentUser.id).then(({ profile }) => {
        if (profile) setSubscriptionTier(profile.subscription_tier);
      });
    } else {
      setSubscriptionTier('free');
    }
  }, [currentUser]);

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
    if (subscriptionTier === 'free' && nodes.length >= 150) {
      setIsPricingModalOpen(true);
      return;
    }

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

      {/* Top UI Overlay */}
      <div style={{
        position: 'absolute',
        top: '24px',
        left: '24px',
        right: (selectedNode || selectedEdge) ? '344px' : '24px',
        zIndex: 40,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '1rem',
        pointerEvents: 'none',
        transition: 'right 0.2s ease-in-out'
      }}>
        
        {/* Left/Center Section: Title & Search */}
        <div style={{
          pointerEvents: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          maxWidth: '100%',
        }}>
          <div style={{
            background: 'var(--surface-1)',
            padding: '0.5rem 1.5rem',
            borderRadius: '12px',
            border: '1px solid var(--surface-border)',
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
            fontWeight: 'bold',
            fontSize: '1.2rem',
            color: 'var(--text-primary)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '1rem',
            width: 'max-content'
          }}>
            <span>{currentTreeName}</span>
            {currentUser && (
              <span 
                onClick={() => {
                  if (subscriptionTier === 'pro') {
                    window.location.href = import.meta.env.VITE_STRIPE_PORTAL_LINK;
                  } else {
                    setIsPricingModalOpen(true);
                  }
                }}
                title={subscriptionTier === 'pro' ? 'Manage Subscription' : 'Upgrade to Pro'}
                style={{
                  fontSize: '0.8rem',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: subscriptionTier === 'pro' ? 'linear-gradient(45deg, #f59e0b, #d97706)' : 'var(--surface-border)',
                  color: subscriptionTier === 'pro' ? 'white' : 'var(--text-secondary)',
                  marginLeft: '10px',
                  verticalAlign: 'middle',
                  fontWeight: 'bold',
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  boxShadow: subscriptionTier === 'pro' ? '0 0 10px rgba(245, 158, 11, 0.3)' : 'none',
                  WebkitTextFillColor: subscriptionTier === 'pro' ? 'white' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease',
                }}
                onMouseOver={(e) => e.target.style.transform = 'scale(1.1)'}
                onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
              >
                {subscriptionTier === 'pro' ? 'PRO' : 'FREE'}
              </span>
            )}
            <button onClick={() => setIsEditNameModalOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>✏️</button>
          </div>
          
          <div style={{ position: 'relative', width: 'max-content', maxWidth: '100%' }}>
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              background: 'var(--surface-1)',
              padding: '0.5rem',
              borderRadius: '12px',
              border: '1px solid var(--surface-border)',
              boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
              flexWrap: 'wrap'
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
                  minWidth: '150px',
                  flex: 1
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
                boxShadow: '0 4px 6px rgba(0,0,0,0.3)', overflow: 'hidden', zIndex: 50
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

        {/* Right Section: Auth & Actions */}
        <div style={{
          pointerEvents: 'auto',
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
          justifyContent: 'flex-end',
          maxWidth: '100%',
          flex: '1 1 auto',
          alignItems: 'center'
        }}>
          {currentUser ? (
            <>
              {subscriptionTier === 'free' && (
                <button 
                  onClick={() => setIsPricingModalOpen(true)} 
                  style={{...btnStyle, background: 'linear-gradient(45deg, #f59e0b, #d97706)', color: '#fff', border: 'none', fontWeight: 'bold'}}
                >
                  ⭐ Upgrade to Pro
                </button>
              )}
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

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
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
      <PricingModal 
        isOpen={isPricingModalOpen} 
        onClose={() => setIsPricingModalOpen(false)} 
        currentUser={currentUser} 
      />
    </div>
    </TreeContext.Provider>
  );
}
