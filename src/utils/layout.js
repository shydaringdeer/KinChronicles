import dagre from 'dagre';

export const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const defaultNodeWidth = 260; 
  const defaultNodeHeight = 240; 
  
  const HORIZONTAL_GAP = 320; // Distance to place spouses

  dagreGraph.setGraph({ rankdir: direction, nodesep: 100, ranksep: 160 });

  // Separate edges into vertical (bloodline) and horizontal (spouses)
  const isHorizontal = (edge) => {
    const rel = edge.data?.relationType;
    if (rel === 'married' || rel === 'betrothed' || rel === 'lovers') return true;
    if (edge.sourceHandle === 'right' || edge.sourceHandle === 'left' || edge.targetHandle === 'left' || edge.targetHandle === 'right') return true;
    return false;
  };

  const verticalEdges = edges.filter(e => !isHorizontal(e));
  const horizontalEdges = edges.filter(e => isHorizontal(e));

  // Determine which nodes are part of the main tree (have vertical edges or are isolated roots)
  const coreNodeIds = new Set();
  verticalEdges.forEach(e => {
    coreNodeIds.add(e.source);
    coreNodeIds.add(e.target);
  });
  
  // If a node has NO edges at all, it's also a core node (isolated)
  // If a node ONLY has horizontal edges, it's an "in-law" spouse
  const inLawNodes = new Set();
  
  nodes.forEach(node => {
    const hasAnyVertical = coreNodeIds.has(node.id);
    if (!hasAnyVertical) {
      // Check if they have horizontal edges
      const hasHorizontal = horizontalEdges.some(e => e.source === node.id || e.target === node.id);
      if (hasHorizontal) {
        inLawNodes.add(node.id);
      } else {
        coreNodeIds.add(node.id); // Completely isolated, let dagre handle it
      }
    }
  });

  // Add only Core nodes to dagre
  nodes.forEach((node) => {
    if (!inLawNodes.has(node.id)) {
      if (node.type === 'waypoint') {
        dagreGraph.setNode(node.id, { width: 10, height: 10 });
      } else {
        // Find how many in-law spouses this node has
        const spouseCount = horizontalEdges.filter(e => 
          (e.source === node.id && inLawNodes.has(e.target)) || 
          (e.target === node.id && inLawNodes.has(e.source))
        ).length;
        
        const nWidth = node.measured?.width || node.width || defaultNodeWidth;
        const nHeight = node.measured?.height || node.height || defaultNodeHeight;
        
        // Inflate width to make room for spouses to the right
        const effectiveWidth = nWidth + (spouseCount * HORIZONTAL_GAP);
        // We need to store the effective width so we can offset correctly later
        dagreGraph.setNode(node.id, { width: effectiveWidth, height: nHeight, spouseCount });
      }
    }
  });

  // Add only vertical edges to dagre
  verticalEdges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Calculate Layout for Core Tree
  dagre.layout(dagreGraph);

  // Apply layout to all nodes
  const layoutedNodes = nodes.map((node) => {
    if (!inLawNodes.has(node.id)) {
      const nodeWithPosition = dagreGraph.node(node.id);
      
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
        
        // nodeWithPosition.x is the center of the inflated box.
        // We want to place the actual node at the far left of this box.
        return {
          ...node,
          position: {
            x: nodeWithPosition.x - (effectiveWidth / 2),
            y: nodeWithPosition.y - (nHeight / 2),
          }
        };
      }
    }
    return node; // We will handle inLaws next
  });

  // Second Pass: Position In-Laws next to their Core partners
  layoutedNodes.forEach(node => {
    if (inLawNodes.has(node.id)) {
      // Find their partner in the Core tree
      const spouseEdge = horizontalEdges.find(e => e.source === node.id || e.target === node.id);
      if (spouseEdge) {
        const partnerId = spouseEdge.source === node.id ? spouseEdge.target : spouseEdge.source;
        const partnerNode = layoutedNodes.find(n => n.id === partnerId);
        
        if (partnerNode) {
          const partnerHeight = partnerNode.measured?.height || partnerNode.height || defaultNodeHeight;
          const nodeCurrentHeight = node.measured?.height || node.height || defaultNodeHeight;
          
          const partnerCenterY = partnerNode.position.y + (partnerHeight / 2);
          
          node.position = {
            x: partnerNode.position.x + HORIZONTAL_GAP,
            y: partnerCenterY - (nodeCurrentHeight / 2)
          };
        }
      }
    }
  });

  return { layoutedNodes, layoutedEdges: edges };
};
