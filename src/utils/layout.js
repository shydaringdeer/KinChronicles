import dagre from 'dagre';

export const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const nodeWidth = 260; 
  const nodeHeight = 240; 
  
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
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
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
      const width = node.type === 'waypoint' ? 10 : nodeWidth;
      const height = node.type === 'waypoint' ? 10 : nodeHeight;

      return {
        ...node,
        position: {
          x: nodeWithPosition.x - width / 2,
          y: nodeWithPosition.y - height / 2,
        }
      };
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
          // Check if partner has right-side connections
          // We'll place the spouse to the right. If multiple spouses, we'd need to offset more, 
          // but for simplicity, place to the right.
          // To avoid overlapping other core nodes, dagre nodesep usually gives 100px gap. 
          // Spouses might overlap cousins, but this is a standard family tree dilemma.
          node.position = {
            x: partnerNode.position.x + HORIZONTAL_GAP,
            y: partnerNode.position.y
          };
        }
      }
    }
  });

  return { layoutedNodes, layoutedEdges: edges };
};
