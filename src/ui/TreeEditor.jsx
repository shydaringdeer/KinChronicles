import React, { useCallback, useMemo, useState, useRef } from 'react';
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
  const [rfInstance, setRfInstance] = useState(null);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

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
        nodes={nodes}
        edges={edges}
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

      {/* Floating Toolbar */}
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
    </div>
  );
}
