import React, { useState, useRef } from 'react';
import { BaseEdge, getSmoothStepPath, useReactFlow, Position } from '@xyflow/react';

export default function DraggableEdge(props) {
  const {
    id,
    source,
    target,
    sourceHandleId,
    targetHandleId,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style,
    markerEnd,
  } = props;

  const { setNodes, setEdges, screenToFlowPosition } = useReactFlow();
  const [dragPos, setDragPos] = useState(null);
  const startPos = useRef(null);

  const isDragging = dragPos !== null;

  let path = '';
  const isTB = sourcePosition === Position.Bottom && targetPosition === Position.Top;

  if (isDragging) {
    const [path1] = getSmoothStepPath({
      sourceX, sourceY, sourcePosition,
      targetX: dragPos.x, targetY: dragPos.y, targetPosition: Position.Top,
    });
    const [path2] = getSmoothStepPath({
      sourceX: dragPos.x, sourceY: dragPos.y, sourcePosition: Position.Bottom,
      targetX, targetY, targetPosition,
    });
    path = path1 + ' ' + path2;
  } else {
    if (isTB) {
      // Deterministic hash based on source ID to group siblings on the same horizontal trunk lane,
      // but separate different families onto different lanes to prevent overlapping intersections.
      let hash = 0;
      for (let i = 0; i < source.length; i++) {
        hash = source.charCodeAt(i) + ((hash << 5) - hash);
      }
      const offset = (Math.abs(hash) % 80) - 40; // Generate offset between -40 and +40
      
      const midY = ((sourceY + targetY) / 2) + offset;
      const radius = 10;
      
      if (Math.abs(sourceX - targetX) <= 1) {
        path = `M ${sourceX},${sourceY} L ${targetX},${targetY}`;
      } else if (Math.abs(sourceX - targetX) < radius * 2) {
        path = `M ${sourceX},${sourceY} L ${sourceX},${midY} L ${targetX},${midY} L ${targetX},${targetY}`;
      } else {
        const isRight = targetX > sourceX;
        const r = isRight ? radius : -radius;
        path = `M ${sourceX},${sourceY} L ${sourceX},${midY - radius} Q ${sourceX},${midY} ${sourceX + r},${midY} L ${targetX - r},${midY} Q ${targetX},${midY} ${targetX},${midY + radius} L ${targetX},${targetY}`;
      }
    } else {
      const [standardPath] = getSmoothStepPath({
        sourceX, sourceY, sourcePosition,
        targetX, targetY, targetPosition,
      });
      path = standardPath;
    }
  }

  const handlePointerDown = (e) => {
    // Only left click
    if (e.button !== 0) return;
    
    e.stopPropagation();
    e.target.setPointerCapture(e.pointerId);
    
    startPos.current = { x: e.clientX, y: e.clientY };
    const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    setDragPos(flowPos);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    e.stopPropagation();
    
    const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    setDragPos(flowPos);
  };

  const handlePointerUp = (e) => {
    if (!isDragging) return;
    e.stopPropagation();
    e.target.releasePointerCapture(e.pointerId);
    
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const flowPos = dragPos;
    setDragPos(null);
    startPos.current = null;

    // If it was a click (moved less than 5 pixels)
    if (distance < 5) {
      // It's a click. 
      // We manually select the edge.
      setEdges(eds => eds.map(edge => ({
        ...edge,
        selected: edge.id === id ? true : false
      })));
      return;
    }

    // It was a drag! Commit the waypoint split.
    const waypointId = 'wp-' + Date.now();
    const waypointNode = {
      id: waypointId,
      type: 'waypoint',
      position: { x: flowPos.x - 10, y: flowPos.y - 10 },
      data: {}
    };
    
    const newEdge1 = {
      id: 'e-' + source + '-' + waypointId,
      source: source,
      sourceHandle: sourceHandleId,
      target: waypointId,
      targetHandle: 'target',
      type: 'smoothstep', 
      style: style,
      selected: false
    };
    
    const newEdge2 = {
      id: 'e-' + waypointId + '-' + target,
      source: waypointId,
      sourceHandle: 'source',
      target: target,
      targetHandle: targetHandleId,
      type: 'smoothstep',
      style: style,
      selected: false
    };
    
    setNodes((nds) => nds.concat(waypointNode));
    setEdges((eds) => eds.filter((e) => e.id !== id).concat(newEdge1, newEdge2));
  };

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={path}
        fill="none"
        markerEnd={markerEnd}
        style={{ ...style, strokeWidth: style?.strokeWidth || 2 }}
      />
      {/* Invisible thicker path for easier interaction */}
      <path
        d={path}
        fill="none"
        strokeOpacity={0}
        strokeWidth={20}
        className="react-flow__edge-interaction"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{ cursor: 'grab' }}
      />
    </>
  );
}
