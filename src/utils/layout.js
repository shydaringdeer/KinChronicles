import dagre from 'dagre';

export const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const nodeWidth = 260; // Approximate width of a PersonNode card
  const nodeHeight = 240; // Approximate height

  dagreGraph.setGraph({ rankdir: direction, nodesep: 100, ranksep: 160 });

  nodes.forEach((node) => {
    if (node.type === 'waypoint') {
      dagreGraph.setNode(node.id, { width: 10, height: 10 });
    } else {
      dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    }
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
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
  });

  return { layoutedNodes, layoutedEdges: edges };
};
