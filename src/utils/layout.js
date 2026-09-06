import dagre from 'dagre';

export const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph({ directed: true, multigraph: true });
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

  // 1. Group nodes into marriage components
  const adj = {};
  nodes.forEach(n => adj[n.id] = []);
  horizontalEdges.forEach(e => {
    adj[e.source].push(e.target);
    adj[e.target].push(e.source);
  });

  const visited = new Set();
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
      
      let chosenCore = comp[0];
      let bestScore = -1;
      comp.forEach(id => {
        let score = 0;
        if (verticalEdges.some(e => e.target === id)) score += 2; 
        if (verticalEdges.some(e => e.source === id)) score += 1; 
        if (score > bestScore || (score === bestScore && id < chosenCore)) {
          bestScore = score;
          chosenCore = id;
        }
      });

      coreNodes.add(chosenCore);
      
      comp.forEach(id => {
        if (id !== chosenCore) {
          inLawNodes.add(id);
          inLawToCore.set(id, { coreId: chosenCore });
        }
      });
    }
  });

  const coreToInLawCount = {};
  nodes.forEach(n => {
      if (inLawNodes.has(n.id)) {
          const coreId = inLawToCore.get(n.id).coreId;
          coreToInLawCount[coreId] = (coreToInLawCount[coreId] || 0) + 1;
          inLawToCore.get(n.id).index = coreToInLawCount[coreId];
      }
  });

  // 2. Add Core nodes to dagre
  nodes.forEach((node) => {
    if (coreNodes.has(node.id)) {
      if (node.type === 'waypoint') {
        dagreGraph.setNode(node.id, { width: 10, height: 10 });
      } else {
        const spouseCount = coreToInLawCount[node.id] || 0;
        const nWidth = node.measured?.width || node.width || defaultNodeWidth;
        const nHeight = node.measured?.height || node.height || defaultNodeHeight;
        
        const effectiveWidth = nWidth + (spouseCount * HORIZONTAL_GAP);
        dagreGraph.setNode(node.id, { width: effectiveWidth, height: nHeight, spouseCount });
      }
    }
  });

  // 3. Add vertical edges to dagre, rewiring InLaw edges to their Core
  verticalEdges.forEach((edge) => {
    let sourceId = edge.source;
    let targetId = edge.target;

    if (inLawNodes.has(sourceId)) sourceId = inLawToCore.get(sourceId).coreId;
    if (inLawNodes.has(targetId)) targetId = inLawToCore.get(targetId).coreId;

    if (sourceId !== targetId) {
      dagreGraph.setEdge(sourceId, targetId);
    }
  });

  // 4. Calculate Layout
  dagre.layout(dagreGraph);

  // 5. Swap Parent X Coordinates to prevent diagonal crossing overlaps
  // Core is on the left, InLaws are on the right.
  // We force Core's parents to the left, and InLaw's parents to the right.
  coreNodes.forEach(childCoreId => {
    const parentsOfCore = [];
    const parentsOfInLaws = [];

    verticalEdges.forEach(edge => {
      let targetCore = inLawNodes.has(edge.target) ? inLawToCore.get(edge.target).coreId : edge.target;
      if (targetCore === childCoreId) {
        let sourceCore = inLawNodes.has(edge.source) ? inLawToCore.get(edge.source).coreId : edge.source;
        if (edge.target === childCoreId) {
          parentsOfCore.push(sourceCore);
        } else {
          parentsOfInLaws.push(sourceCore);
        }
      }
    });

    const uniqueCoreParents = [...new Set(parentsOfCore)];
    const uniqueInLawParents = [...new Set(parentsOfInLaws)];

    // Exclude parents that are shared by both spouses (e.g. half-siblings marrying)
    const cOnly = uniqueCoreParents.filter(id => !uniqueInLawParents.includes(id));
    const iOnly = uniqueInLawParents.filter(id => !uniqueCoreParents.includes(id));

    if (cOnly.length > 0 && iOnly.length > 0) {
      const allParents = [...cOnly, ...iOnly];
      const parentNodes = allParents.map(id => ({ id, pos: dagreGraph.node(id) })).filter(p => p.pos);
      
      const byY = {};
      parentNodes.forEach(p => {
        const yStr = Math.round(p.pos.y).toString();
        if (!byY[yStr]) byY[yStr] = [];
        byY[yStr].push(p);
      });

      Object.values(byY).forEach(rankParents => {
        if (rankParents.length > 1) {
          const sortedX = rankParents.map(p => p.pos.x).sort((a, b) => a - b);
          
          const cParents = rankParents.filter(p => cOnly.includes(p.id));
          const iParents = rankParents.filter(p => iOnly.includes(p.id));
          
          let xIndex = 0;
          cParents.forEach(p => { p.pos.x = sortedX[xIndex++]; });
          iParents.forEach(p => { p.pos.x = sortedX[xIndex++]; });
        }
      });
    }
  });

  // 6. Apply layout to Cores and create new objects for InLaws
  let layoutedNodes = nodes.map((node) => {
    if (coreNodes.has(node.id)) {
      const nodeWithPosition = dagreGraph.node(node.id);
      if (!nodeWithPosition) return node;

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
    
    // Create new object for InLaws so React Flow detects the state change
    if (inLawNodes.has(node.id)) {
      return { ...node };
    }
    
    return node; 
  });

  // 7. Position InLaws
  layoutedNodes = layoutedNodes.map(node => {
    if (inLawNodes.has(node.id)) {
      const info = inLawToCore.get(node.id);
      if (info) {
        const partnerNode = layoutedNodes.find(n => n.id === info.coreId);
        if (partnerNode) {
          const partnerHeight = partnerNode.measured?.height || partnerNode.height || defaultNodeHeight;
          const nodeCurrentHeight = node.measured?.height || node.height || defaultNodeHeight;
          
          const partnerCenterY = partnerNode.position.y + (partnerHeight / 2);
          
          return {
            ...node,
            position: {
              x: partnerNode.position.x + (HORIZONTAL_GAP * info.index),
              y: partnerCenterY - (nodeCurrentHeight / 2)
            }
          };
        }
      }
    }
    return node;
  });

  return { layoutedNodes, layoutedEdges: edges };
};
