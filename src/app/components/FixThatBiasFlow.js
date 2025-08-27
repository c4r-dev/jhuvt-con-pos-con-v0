import React, { useCallback, useMemo } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';

function CustomNode({ data, selected }) {
  const nodeStyle = {
    padding: '16px',
    border: `2px solid ${getBorderColor(data, selected)}`,
    borderRadius: '8px',
    backgroundColor: getBackgroundColor(data, selected),
    boxShadow: selected ? '0 4px 12px rgba(59, 130, 246, 0.3)' : getBoxShadow(data),
    maxWidth: '300px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  };

  function getBorderColor(data, selected) {
    if (selected) return '#3b82f6'; // Blue for selected
    if (data.isIncorrectSelection) return '#ef4444'; // Red for incorrect confirmed selection
    if (data.isCorrect && data.showFeedback) return '#10b981'; // Green for correct in solution phase
    return '#6b7280'; // Default gray
  }

  function getBackgroundColor(data, selected) {
    if (selected) return '#dbeafe'; // Light blue for selected
    if (data.isIncorrectSelection) return '#fef2f2'; // Light red for incorrect confirmed selection
    if (data.isCorrect && data.showFeedback) return '#ecfdf5'; // Light green for correct in solution phase
    return '#ffffff'; // Default white
  }

  function getBoxShadow(data) {
    if (data.isIncorrectSelection) return '0 2px 8px rgba(239, 68, 68, 0.2)'; // Red shadow for incorrect
    if (data.isCorrect && data.showFeedback) return '0 2px 8px rgba(16, 185, 129, 0.2)'; // Green shadow for correct
    return '0 2px 4px rgba(0, 0, 0, 0.1)'; // Default shadow
  }

  function getTextColor(data, selected) {
    if (data.isIncorrectSelection) return '#991b1b'; // Dark red for incorrect
    return '#374151'; // Default dark gray
  }

  return (
    <div style={nodeStyle}>
      <div style={{ 
        fontSize: '14px', 
        lineHeight: '1.4',
        color: getTextColor(data, selected),
        fontWeight: selected ? '600' : '400'
      }}>
        {data.label}
      </div>
    </div>
  );
}

const nodeTypes = {
  custom: CustomNode,
};

export default function FixThatBiasFlow({ 
  caseStudy, 
  selectedNodeId, 
  onNodeClick, 
  showFeedback = false,
  incorrectSelectionId = null, // New prop for tracking incorrect selections
  onPaneClick // <-- Add this prop
}) {
  const initialNodes = useMemo(() => {
    if (!caseStudy) return [];
    
    return caseStudy.methodsSteps.map((step) => ({
      id: step.id,
      type: 'custom',
      position: step.position,
      data: { 
        label: step.text,
        isCorrect: step.isCorrect,
        showFeedback: showFeedback,
        isIncorrectSelection: incorrectSelectionId === step.id,
      },
      selected: selectedNodeId === step.id,
      draggable: false, // Disable dragging
    }));
  }, [caseStudy, selectedNodeId, showFeedback, incorrectSelectionId]);

  const initialEdges = useMemo(() => {
    if (!caseStudy || caseStudy.methodsSteps.length < 2) return [];
    
    // Create edges to connect nodes in a logical flow
    const edges = [];
    for (let i = 0; i < caseStudy.methodsSteps.length - 1; i++) {
      edges.push({
        id: `e${i}`,
        source: caseStudy.methodsSteps[i].id,
        target: caseStudy.methodsSteps[i + 1].id,
        type: 'smoothstep',
        style: { stroke: '#94a3b8', strokeWidth: 2 },
      });
    }
    return edges;
  }, [caseStudy]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const onNodeClickHandler = useCallback((event, node) => {
    if (onNodeClick) {
      onNodeClick(node.id);
    }
  }, [onNodeClick]);

  // Update nodes when props change
  React.useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  React.useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  if (!caseStudy) {
    return (
      <div style={{ 
        width: '100%', 
        height: '400px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f9fafb',
        border: '2px dashed #d1d5db',
        borderRadius: '8px'
      }}>
        <p style={{ color: '#6b7280', fontSize: '16px' }}>Loading case study...</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '500px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClickHandler}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        onPaneClick={onPaneClick}
      >
        <Controls />
        <MiniMap />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>
    </div>
  );
} 