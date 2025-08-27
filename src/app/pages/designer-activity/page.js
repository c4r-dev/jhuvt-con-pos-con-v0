'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  EdgeLabelRenderer,
  useNodesState,
  useEdgesState,
  addEdge,
  Position,
  Handle,
  NodeResizer,
  NodeToolbar,
  getSmoothStepPath,
} from '@xyflow/react';
import { nanoid } from 'nanoid';

import '@xyflow/react/dist/style.css';
import './designer-activity.css';

// Simple custom node component for the designer
const SimpleCustomNode = ({ id, data, selected, isConnectable }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.label || 'Node');
  const textareaRef = useRef(null);

  const nodeClasses = `custom-node ${selected ? 'selected' : ''} ${isEditing ? 'editing' : ''}`;
  
  const nodeStyle = {
    backgroundColor: data.bgColor || undefined,
    color: data.textColor || undefined,
  };

  // Auto-resize textarea function
  const autoResizeTextarea = useCallback(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(20, textarea.scrollHeight)}px`;
    }
  }, []);

  // Auto-resize when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      setTimeout(autoResizeTextarea, 0);
    }
  }, [isEditing, autoResizeTextarea]);

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditValue(data.label || 'Node');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && e.shiftKey) {
      // Shift+Enter to finish editing
      e.preventDefault();
      setIsEditing(false);
      if (data.updateLabel) {
        data.updateLabel(id, editValue);
      }
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(data.label || 'Node');
    }
    // Regular Enter key will create newlines in the textarea
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (data.updateLabel) {
      data.updateLabel(id, editValue);
    }
  };

  return (
    <div className={nodeClasses} style={nodeStyle}>
      <NodeToolbar isVisible={selected || isEditing} position={Position.Top} aria-label="Node toolbar">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label className="sr-only" htmlFor={`bg-${id}`}>Background color</label>
          <input
            id={`bg-${id}`}
            type="color"
            value={data.bgColor || '#f2f2f2'}
            onChange={(e) => data.updateStyle && data.updateStyle(id, { bgColor: e.target.value })}
            aria-label="Background color"
          />
          <label className="sr-only" htmlFor={`fg-${id}`}>Text color</label>
          <input
            id={`fg-${id}`}
            type="color"
            value={data.textColor || '#333333'}
            onChange={(e) => data.updateStyle && data.updateStyle(id, { textColor: e.target.value })}
            aria-label="Text color"
          />
          <button
            className="btn btn--secondary"
            onClick={() => data.deleteNode && data.deleteNode(id)}
            aria-label="Delete node"
            type="button"
          >
            Delete
          </button>
        </div>
      </NodeToolbar>
      <NodeResizer
        color="#0078d4"
        isVisible={selected}
        minWidth={100}
        minHeight={50}
        keepAspectRatio={false}
      />
      
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        isConnectable={isConnectable}
        aria-label="Input connection point"
      />
      
      {isEditing ? (
        <textarea
          ref={textareaRef}
          className="node-text-input"
          value={editValue}
          onChange={(e) => {
            setEditValue(e.target.value);
            autoResizeTextarea();
          }}
          onKeyDown={handleKeyPress}
          onBlur={handleBlur}
          onClick={(e) => e.stopPropagation()}
          onInput={autoResizeTextarea}
          autoFocus
          aria-label="Edit node text"
          style={{ height: 'auto' }}
        />
      ) : (
        <div 
          className="node-text-display"
          onDoubleClick={handleDoubleClick}
          role="button"
          tabIndex={0}
          aria-label={`Node: ${data.label || 'Node'}. Double-click to edit.`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleDoubleClick(e);
            }
          }}
        >
          {data.label || 'Node'}
        </div>
      )}
      
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        isConnectable={isConnectable}
        aria-label="Output connection point"
      />
    </div>
  );
};

// Custom edge with a delete button when selected
function DeletableSmoothEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, markerEnd, selected, data }) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  return (
    <>
      <path id={id} className="react-flow__edge-path" d={edgePath} markerEnd={markerEnd} style={style} />
      {selected && (
        <EdgeLabelRenderer>
          <button
            className="edge-delete-button"
            style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`, pointerEvents: 'all' }}
            onClick={(e) => {
              e.stopPropagation();
              if (data && typeof data.onDeleteEdge === 'function') {
                data.onDeleteEdge(id);
              }
            }}
            aria-label="Delete edge"
          >
            ×
          </button>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

// Hardcoded minimal flow data for comparison
const flow1Data = {
  nodes: [
    {
      id: '1',
      type: 'input',
      position: { x: 50, y: 50 },
      data: { label: 'Start A' },
    },
    {
      id: '2',
      position: { x: 200, y: 50 },
      data: { label: 'Process A1' },
    },
    {
      id: '3',
      position: { x: 350, y: 50 },
      data: { label: 'End A' },
      type: 'output',
    },
  ],
  edges: [
    { id: 'e1-2', source: '1', target: '2' },
    { id: 'e2-3', source: '2', target: '3' },
  ],
};

const flow2Data = {
  nodes: [
    {
      id: '1',
      type: 'input',
      position: { x: 50, y: 50 },
      data: { label: 'Start B' },
    },
    {
      id: '2',
      position: { x: 150, y: 150 },
      data: { label: 'Process B1' },
    },
    {
      id: '3',
      position: { x: 250, y: 50 },
      data: { label: 'Process B2' },
    },
    {
      id: '4',
      position: { x: 350, y: 100 },
      data: { label: 'End B' },
      type: 'output',
    },
  ],
  edges: [
    { id: 'e1-2', source: '1', target: '2' },
    { id: 'e1-3', source: '1', target: '3' },
    { id: 'e2-4', source: '2', target: '4' },
    { id: 'e3-4', source: '3', target: '4' },
  ],
};

function DesignerActivityPage({ sessionIdFromUrl }) {
  const [phase, setPhase] = useState(1);
  const [userInput, setUserInput] = useState('');
  const [submittedDesigns, setSubmittedDesigns] = useState([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDesign, setModalDesign] = useState(null);
  const lastFocusedElementRef = useRef(null);
  const [liveMessage, setLiveMessage] = useState('');
  const rfInstanceRef = useRef(null);
  const sessionId = sessionIdFromUrl || 'DEFAULT_SESSION_12345';
  
  // Designer state for phase 2
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodes, setSelectedNodes] = useState([]);
  const [selectedEdges, setSelectedEdges] = useState([]);
  const edgeTypes = useMemo(() => ({ deletableEdge: DeletableSmoothEdge }), []);

  const nodeTypes = useMemo(() => ({
    simpleCustom: SimpleCustomNode,
  }), []);

  // Helpers to augment nodes with action handlers (functions don't survive serialization)
  const updateNodeLabel = useCallback((nodeId, newLabel) => {
    setNodes((nds) =>
      nds.map((node) => (node.id === nodeId ? { ...node, data: { ...node.data, label: newLabel } } : node))
    );
  }, [setNodes]);

  const updateNodeStyle = useCallback((nodeId, styleUpdates) => {
    setNodes((nds) =>
      nds.map((node) => (node.id === nodeId ? { ...node, data: { ...node.data, ...styleUpdates } } : node))
    );
  }, [setNodes]);

  const deleteNodeById = useCallback((nodeId) => {
    const confirmed = typeof window !== 'undefined' ? window.confirm('Delete this node? This cannot be undone.') : true;
    if (!confirmed) return;
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setLiveMessage('Node deleted');
  }, [setNodes, setEdges]);

  const injectHandlers = useCallback((node) => ({
    ...node,
    data: {
      ...node.data,
      updateLabel: updateNodeLabel,
      updateStyle: updateNodeStyle,
      deleteNode: deleteNodeById,
    },
  }), [updateNodeLabel, updateNodeStyle, deleteNodeById]);

  // Load from localStorage and normalize colors for light mode
  useEffect(() => {
    try {
      const savedNodes = JSON.parse(localStorage.getItem('designer:nodes') || '[]');
      const savedEdges = JSON.parse(localStorage.getItem('designer:edges') || '[]');
      if (Array.isArray(savedNodes) && savedNodes.length) {
        // Ensure light-mode defaults for nodes (bg white, text dark) if missing
        const normalized = savedNodes.map((n) => ({
          ...n,
          data: {
            ...n.data,
            bgColor: n?.data?.bgColor || '#ffffff',
            textColor: n?.data?.textColor || '#212529',
          },
        }));
        setNodes(normalized.map(injectHandlers));
        const normalizedEdges = (Array.isArray(savedEdges) ? savedEdges : []).map((e) => ({
          ...e,
          type: 'deletableEdge',
          markerEnd: e.markerEnd || { type: 'arrowclosed' },
          data: { ...(e.data || {}), onDeleteEdge: deleteEdgeById },
        }));
        setEdges(normalizedEdges);
        setPhase(2);
        setLiveMessage('Restored your last design');
      }
    } catch (e) {
      // ignore
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (phase === 2) {
      const serializableNodes = nodes.map((n) => ({ ...n, data: { ...n.data, updateLabel: undefined, updateStyle: undefined, deleteNode: undefined } }));
      localStorage.setItem('designer:nodes', JSON.stringify(serializableNodes));
      localStorage.setItem('designer:edges', JSON.stringify(edges));
    }
  }, [nodes, edges, phase]);

  const handlePhase1Submit = useCallback(() => {
    if (userInput.trim().length >= 20) {
      setPhase(2);
    }
  }, [userInput]);

  const onConnect = useCallback((connection) => {
    const newEdge = {
      ...connection,
      id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
      type: 'deletableEdge',
      animated: false,
      markerEnd: { type: 'arrowclosed' },
      data: { onDeleteEdge: deleteEdgeById },
    };
    setEdges((eds) => addEdge(newEdge, eds));
    setLiveMessage('Connection created');
  }, [setEdges]);

  const addNewNode = useCallback(() => {
    const newNode = {
      id: nanoid(),
      type: 'simpleCustom',
      position: {
        x: Math.random() * 400 + 100,
        y: Math.random() * 400 + 100,
      },
      data: {
        label: `Node ${nodes.length + 1}`,
        bgColor: '#ffffff',
        textColor: '#212529',
        updateLabel: updateNodeLabel,
        updateStyle: updateNodeStyle,
        deleteNode: deleteNodeById,
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setLiveMessage('Node added');
  }, [setNodes, nodes.length, updateNodeLabel, updateNodeStyle, deleteNodeById]);

  const handleSubmitDesign = useCallback(async () => {
    // Sanitize nodes and edges so no selection/toolbars appear in submissions
    const sanitizedNodes = nodes.map((n) => ({
      ...n,
      selected: false,
      dragging: false,
      data: { ...n.data, updateLabel: undefined, updateStyle: undefined, deleteNode: undefined },
    }));
    const sanitizedEdges = edges.map((e) => ({
      ...e,
      type: 'smoothstep',
      selected: false,
      data: undefined,
      markerEnd: e.markerEnd || { type: 'arrowclosed' },
    }));

    const designData = {
      id: nanoid(),
      sessionId,
      nodes: sanitizedNodes,
      edges: sanitizedEdges,
      timestamp: new Date().toISOString(),
      nodeCount: sanitizedNodes.length,
      edgeCount: sanitizedEdges.length,
    };

    try {
      await fetch('/api/dagForCasalityAPI', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          nodes: designData.nodes,
          edges: designData.edges,
          nodeCount: designData.nodeCount,
          edgeCount: designData.edgeCount,
          createdDate: designData.timestamp,
        }),
      });
    } catch (e) {
      // non-blocking
      console.error('Failed to submit design to server', e);
    }

    // Add to submitted designs (local preview)
    setSubmittedDesigns((prev) => [...prev, designData]);

    // Clear current design and move to results view
    setNodes([]);
    setEdges([]);
    setPhase(3);
    localStorage.removeItem('designer:nodes');
    localStorage.removeItem('designer:edges');
  }, [nodes, edges, setNodes, setEdges, sessionId]);

  const fetchSubmissions = useCallback(async () => {
    try {
      setIsLoadingSubmissions(true);
      const res = await fetch(`/api/dagForCasalityAPI?sessionId=${encodeURIComponent(sessionId)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Failed to load submissions');
      const data = await res.json();
      setSubmittedDesigns(Array.isArray(data) ? data : []);
    } catch (e) {
      // leave prior state
      console.error(e);
    } finally {
      setIsLoadingSubmissions(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (phase === 3) {
      fetchSubmissions();
    }
  }, [phase, fetchSubmissions]);

  // Manage body scroll lock when modal open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isModalOpen]);

  const openModal = useCallback((design) => {
    lastFocusedElementRef.current = document.activeElement;
    setModalDesign(design);
    setIsModalOpen(true);
    setTimeout(() => {
      const closeBtn = document.getElementById('submission-modal-close');
      closeBtn?.focus();
    }, 0);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setModalDesign(null);
    const el = lastFocusedElementRef.current;
    if (el && typeof el.focus === 'function') {
      el.focus();
    }
  }, []);

  const handleCreateNewDesign = useCallback(() => {
    setPhase(2);
  }, []);

  const handleFitView = useCallback(() => {
    try {
      rfInstanceRef.current?.fitView({ padding: 0.2 });
    } catch (e) {
      // ignore
    }
  }, []);

  // Export JSON removed per requirement

  const handleClearCanvas = useCallback(() => {
    setNodes([]);
    setEdges([]);
    localStorage.removeItem('designer:nodes');
    localStorage.removeItem('designer:edges');
    setLiveMessage('Canvas cleared');
  }, [setNodes, setEdges]);

  // Selection tracking for keyboard actions
  const onSelectionChange = useCallback(({ nodes: selNodes, edges: selEdges }) => {
    setSelectedNodes(selNodes);
    setSelectedEdges(selEdges);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e) => {
      const isMeta = e.metaKey || e.ctrlKey;
      const targetTag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
      const isTyping = targetTag === 'input' || targetTag === 'textarea' || e.target?.isContentEditable;
      // Delete selected
      if ((e.key === 'Delete' || e.key === 'Backspace') && phase === 2) {
        if (isTyping) return;
        if (selectedEdges.length) {
          e.preventDefault();
          const selectedEdgeIds = new Set(selectedEdges.map((se) => se.id));
          setEdges((eds) => eds.filter((edge) => !selectedEdgeIds.has(edge.id)));
          setLiveMessage('Connection(s) deleted');
        }
        // Node deletion via keyboard is disabled; use node delete button
      }
      // Duplicate node (Cmd/Ctrl + D)
      if (isMeta && (e.key.toLowerCase() === 'd') && phase === 2) {
        if (selectedNodes.length === 1) {
          e.preventDefault();
          const node = selectedNodes[0];
          const dup = {
            ...node,
            id: nanoid(),
            position: { x: node.position.x + 24, y: node.position.y + 24 },
          };
          setNodes((nds) => [...nds, injectHandlers(dup)]);
          setLiveMessage('Node duplicated');
        }
      }
      // Fit view (Cmd/Ctrl + 0)
      if (isMeta && e.key === '0' && phase === 2) {
        e.preventDefault();
        handleFitView();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, selectedNodes, selectedEdges, setNodes, setEdges, injectHandlers, handleFitView]);

  if (phase === 1) {
    return (
      <div className="designer-activity-container">
        <a href="#design-canvas" className="skip-link">Skip to design canvas</a>
        <header>
          <h1 className="heading-primary">instructions 1 here</h1>
        </header>
        
        <section className="comparison-section">
          <div className="comparison-grid">
            <div className="dag-container">
              <div className="dag-header">
                <h3 className="heading-secondary">DAG A</h3>
              </div>
              <div className="dag-viewer">
                <ReactFlow
                  nodes={flow1Data.nodes}
                  edges={flow1Data.edges}
                  nodesDraggable={false}
                  nodesConnectable={false}
                  elementsSelectable={false}
                  zoomOnScroll={false}
                  zoomOnPinch={false}
                  panOnDrag={false}
                  fitView
                  proOptions={{ hideAttribution: true }}
                >
                  <Background variant="dots" gap={12} size={1} />
                </ReactFlow>
              </div>
            </div>
            
            <div className="dag-container">
              <div className="dag-header">
                <h3 className="heading-secondary">DAG B</h3>
              </div>
              <div className="dag-viewer">
                <ReactFlow
                  nodes={flow2Data.nodes}
                  edges={flow2Data.edges}
                  nodesDraggable={false}
                  nodesConnectable={false}
                  elementsSelectable={false}
                  zoomOnScroll={false}
                  zoomOnPinch={false}
                  panOnDrag={false}
                  fitView
                  proOptions={{ hideAttribution: true }}
                >
                  <Background variant="dots" gap={12} size={1} />
                </ReactFlow>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="dag-comparison" className="form-label">
              What differences do you see between the two DAGs?
            </label>
            <textarea
              id="dag-comparison"
              className="form-textarea"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Describe the differences you observe between the two DAGs..."
              aria-describedby="character-counter"
            />
            <div 
              id="character-counter"
              className={`character-counter ${userInput.trim().length >= 20 ? 'character-counter--valid' : 'character-counter--invalid'}`}
            >
              {userInput.trim().length}/20 characters minimum
            </div>
            <button
              className={`btn ${userInput.trim().length >= 20 ? 'btn--primary' : 'btn--secondary'} btn--large`}
              onClick={handlePhase1Submit}
              disabled={userInput.trim().length < 20}
              aria-describedby="character-counter"
            >
              Continue to Phase 2
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (phase === 2) {
    return (
      <div className="designer-activity-container">
        <a href="#design-canvas" className="skip-link">Skip to design canvas</a>
        <header>
          <h1 className="heading-primary">instructions 2 here</h1>
        </header>
        
        <div className="designer-controls">
          <button
            className="btn btn--primary"
            onClick={addNewNode}
            aria-label="Add a new node to the canvas"
          >
            Add Node
          </button>
          <button
            className={`btn ${nodes.length === 0 ? 'btn--secondary' : 'btn--success'}`}
            onClick={handleSubmitDesign}
            disabled={nodes.length === 0}
            aria-label="Submit your completed design"
          >
            Submit Design
          </button>
          <button
            className="btn btn--secondary"
            onClick={handleFitView}
            aria-label="Fit view to nodes"
            type="button"
          >
            Fit View
          </button>
          
          <button
            className="btn btn--secondary"
            onClick={handleClearCanvas}
            aria-label="Clear the canvas"
            type="button"
          >
            Clear
          </button>
          <p className="designer-help-text">
            Double-click nodes to edit text. Click and drag between nodes to create connections. Select a node to resize it.
          </p>
          <details>
            <summary className="text-small">Keyboard shortcuts</summary>
            <ul className="text-small" aria-label="Keyboard shortcuts list">
              <li>Delete/Backspace: delete selected connections (edges)</li>
              <li>Cmd/Ctrl + D: duplicate selected node</li>
              <li>Cmd/Ctrl + 0: fit view</li>
              <li>Tab/Shift+Tab: move focus between UI controls</li>
            </ul>
          </details>
        </div>

        <div aria-live="polite" role="status" className="sr-only">{liveMessage}</div>
        <main id="design-canvas" className="flow-canvas" role="application" aria-label="DAG Design Canvas">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            nodesDraggable={true}
            nodesConnectable={true}
            elementsSelectable={true}
            onSelectionChange={onSelectionChange}
            snapToGrid
            snapGrid={[15, 15]}
            panOnScroll
            zoomOnDoubleClick={false}
            selectionOnDrag
            multiSelectionKeyCode="Shift"
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.25}
            maxZoom={1.5}
            proOptions={{ hideAttribution: true }}
            onInit={(instance) => { rfInstanceRef.current = instance; }}
          >
            <Controls />
            <MiniMap pannable zoomable aria-label="Mini map overview" />
            <Background variant="dots" gap={12} size={1} />
          </ReactFlow>
        </main>
      </div>
    );
  }

  // Phase 3: Submitted Designs Grid
  return (
    <div className="designer-activity-container">
      <header className="submitted-designs-header">
        <div>
          <h1 className="heading-primary">Submitted Designs</h1>
          <p className="text-body">Session: {sessionId}</p>
        </div>
        <button
          className="btn btn--primary btn--large"
          onClick={handleCreateNewDesign}
          aria-label="Create a new DAG design"
        >
          Create New Design
        </button>
        <button
          className="btn btn--secondary btn--large"
          onClick={fetchSubmissions}
          aria-label="Refresh submissions"
          disabled={isLoadingSubmissions}
        >
          {isLoadingSubmissions ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      <main>
        {isLoadingSubmissions ? (
          <div className="empty-state" role="status">
            <div className="empty-state-icon" aria-hidden="true">⏳</div>
            <p>Loading submissions…</p>
          </div>
        ) : submittedDesigns.length === 0 ? (
          <div className="empty-state" role="status">
            <div className="empty-state-icon" aria-hidden="true">📊</div>
            <p>No designs submitted yet.</p>
          </div>
        ) : (
          <div className="designs-grid" role="list" aria-label="Submitted DAG designs">
            {submittedDesigns.map((design, index) => (
              <article
                key={design._id || design.id}
                className="design-card"
                role="button"
                tabIndex={0}
                aria-label={`Open Design ${index + 1} in a full-screen view`}
                onClick={() => openModal(design)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openModal(design);
                  }
                }}
              >
                <header className="design-card-header">
                  <h3 className="heading-secondary">Design {index + 1}</h3>
                </header>
                <div className="design-preview" role="img" aria-label={`Preview of Design ${index + 1}`}>
                  <ReactFlow
                    nodes={design.nodes}
                    edges={design.edges}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    nodesDraggable={false}
                    nodesConnectable={false}
                    elementsSelectable={false}
                    zoomOnScroll={false}
                    zoomOnPinch={false}
                    panOnDrag={false}
                    fitView
                    proOptions={{ hideAttribution: true }}
                  >
                    <Background variant="dots" gap={12} size={1} />
                  </ReactFlow>
                </div>
                <div className="design-metadata">
                  <p><strong>Nodes:</strong> {design.nodeCount ?? (design.nodes?.length || 0)}</p>
                  <p><strong>Connections:</strong> {design.edgeCount ?? (design.edges?.length || 0)}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {isModalOpen && modalDesign && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="submission-modal-title"
          onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); closeModal(); } }}
        >
          <div className="modal">
            <div className="modal-header">
              <h2 id="submission-modal-title" className="heading-secondary">Submission Details</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="text-small">Nodes: {modalDesign.nodeCount ?? (modalDesign.nodes?.length || 0)}</span>
                <span className="text-small">Connections: {modalDesign.edgeCount ?? (modalDesign.edges?.length || 0)}</span>
                <button
                  id="submission-modal-close"
                  className="btn btn--secondary"
                  onClick={closeModal}
                  aria-label="Close full-screen view"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="modal-body">
              <div className="modal-flow" role="img" aria-label="Full-screen submission view">
                <ReactFlow
                  nodes={modalDesign.nodes}
                  edges={modalDesign.edges}
                  nodeTypes={nodeTypes}
                  edgeTypes={edgeTypes}
                  nodesDraggable={false}
                  nodesConnectable={false}
                  elementsSelectable={false}
                  zoomOnScroll
                  zoomOnPinch
                  panOnDrag
                  fitView
                  proOptions={{ hideAttribution: true }}
                >
                  <Controls />
                  <MiniMap pannable zoomable aria-label="Mini map overview" />
                  <Background variant="dots" gap={12} size={1} />
                </ReactFlow>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DesignerActivityPageWrapper() {
  const SearchWrapper = () => {
    const params = useSearchParams();
    const sessionIdFromUrl = params.get('sessionID');
    return <DesignerActivityPage sessionIdFromUrl={sessionIdFromUrl} />;
  };
  return (
    <Suspense fallback={<div className="sr-only">Loading session…</div>}>
      <SearchWrapper />
    </Suspense>
  );
}
