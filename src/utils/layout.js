import dagre from 'dagre';

export const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const defaultNodeWidth = 260; 
  const defaultNodeHeight = 240; 
  
  const HORIZONTAL_GAP = 320; // Distance to place spouses

  dagreGraph.setGraph({ rankdir: direction, nodesep: 100, ranksep: 160 });

  const isHorizontal = (edge) => {
    const rel = edge.data?.relationType;
    if (rel === 'married' || rel === 'betrothed' || rel === 'lovers') return true;
    if (edge.sourceHandle === 'right' || edge.sourceHandle === 'left' || edge.targetHandle === 'left' || edge.targetHandle === 'right') return true;
    return false;
  };

  const verticalEdges = edges.filter(e => !isHorizontal(e));
  const horizontalEdges = edges.filter(e => isHorizontal(e));

  const coreNodes = new Set();
  const inLawNodes = new Set();
  const inLawToCore = new Map();

  // 1. Nodes with incoming vertical edges (parents) are Core
  nodes.forEach(n => {
    if (verticalEdges.some(e => e.target === n.id)) {
      coreNodes.add(n.id);
    }
  });

  // 2. Process marriages to identify inLaws
  const visited = new Set();
  const adj = {};
  nodes.forEach(n => adj[n.id] = []);
  horizontalEdges.forEach(e => {
    adj[e.source].push(e.target);
    adj[e.target].push(e.source);
  });

  nodes.forEach(startNode => {
    if (!visited.has(startNode.id)) {
      const comp = [];
      const q = [startNode.id];
      visited.add(startNode.id);
      while(q.length > 0) {
        const curr = q.shift();
        comp.push(curr);
        adj[curr].forEach(neighbor => {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            q.push(neighbor);
          }
        });
      }
      
      let compCores = comp.filter(id => coreNodes.has(id));
      if (compCores.length === 0 && comp.length > 0) {
        // Pick one as Core
        const hasChildren = comp.find(id => verticalEdges.some(e => e.source === id));
        const chosenCore = hasChildren || comp[0];
        coreNodes.add(chosenCore);
        compCores.push(chosenCore);
      }
      
      if (compCores.length > 0) {
        comp.forEach(id => {
          if (!coreNodes.has(id)) {
            inLawNodes.add(id);
            let partnerCore = adj[id].find(neighbor => coreNodes.has(neighbor));
            if (!partnerCore) partnerCore = compCores[0]; // Fallback
            
            let spouseIndex = 1;
            inLawToCore.forEach((info) => {
              if (info.coreId === partnerCore) spouseIndex++;
            });
            
            inLawToCore.set(id, { coreId: partnerCore, index: spouseIndex });
          }
        });
      }
    }
  });

  // 3. Any isolated nodes are Core
  nodes.forEach(n => {
    if (!coreNodes.has(n.id) && !inLawNodes.has(n.id)) {
      coreNodes.add(n.id);
    }
  });

  // 4. Add Core nodes to dagre
  nodes.forEach((node) => {
    if (!inLawNodes.has(node.id)) {
      if (node.type === 'waypoint') {
        dagreGraph.setNode(node.id, { width: 10, height: 10 });
      } else {
        // Count how many inLaws are attached to THIS core node
        let spouseCount = 0;
        inLawToCore.forEach((info) => {
          if (info.coreId === node.id) spouseCount++;
        });
        
        const nWidth = node.measured?.width || node.width || defaultNodeWidth;
        const nHeight = node.measured?.height || node.height || defaultNodeHeight;
        
        const effectiveWidth = nWidth + (spouseCount * HORIZONTAL_GAP);
        dagreGraph.setNode(node.id, { width: effectiveWidth, height: nHeight, spouseCount });
      }
    }
  });

  // 5. Add vertical edges to dagre, EXCLUDING those to/from InLaws
  verticalEdges.forEach((edge) => {
    if (!inLawNodes.has(edge.source) && !inLawNodes.has(edge.target)) {
      dagreGraph.setEdge(edge.source, edge.target);
    }
  });

  // 6. Calculate Layout
  dagre.layout(dagreGraph);

  // 7. Apply layout
  const layoutedNodes = nodes.map((node) => {
    if (!inLawNodes.has(node.id)) {
      const nodeWithPosition = dagreGraph.node(node.id);
      
      if (!nodeWithPosition) return node; // Edge case safety

      if (node.type === 'waypoint') {
        return {
          ...node,
          position: {
            x: nodeWithPosition.x - 5,
            y: nodeWithPosition.y - 5,
          }
        };
      } else {
        const nWidth = node.measured?.width || node.width || defaultNodeWidth;
        const nHeight = node.measured?.height || node.height || defaultNodeHeight;
        const effectiveWidth = nWidth + ((nodeWithPosition.spouseCount || 0) * HORIZONTAL_GAP);
        
        return {
          ...node,
          position: {
            x: nodeWithPosition.x - (effectiveWidth / 2),
            y: nodeWithPosition.y - (nHeight / 2),
          }
        };
      }
    }
    return node; 
  });

  // 8. Position In-Laws
  layoutedNodes.forEach(node => {
    if (inLawNodes.has(node.id)) {
      const info = inLawToCore.get(node.id);
      if (info) {
        const partnerNode = layoutedNodes.find(n => n.id === info.coreId);
        if (partnerNode) {
          const partnerHeight = partnerNode.measured?.height || partnerNode.height || defaultNodeHeight;
          const nodeCurrentHeight = node.measured?.height || node.height || defaultNodeHeight;
          
          const partnerCenterY = partnerNode.position.y + (partnerHeight / 2);
          
          node.position = {
            x: partnerNode.position.x + (HORIZONTAL_GAP * info.index),
            y: partnerCenterY - (nodeCurrentHeight / 2)
          };
        }
      }
    }
  });

  return { layoutedNodes, layoutedEdges: edges };
};
