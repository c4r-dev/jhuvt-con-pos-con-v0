/**
 * Designer Page for creating flowcharts with ReactFlow
 * 
 * Requirements:
 * [✓] Canvas with ReactFlow for designing flowcharts
 * [✓] Left sidebar panel for node creation and editing
 * [✓] Custom node types with the following configurable elements:
 *     [✓] Label (user defined text)
 *     [✓] Text box (user defined text)
 *     [✓] Toggle (user defined text)
 *     [✓] Dropdown (user defined answers)
 *     [✓] Text Box (user defined placeholder text)
 *     [✓] Input Handle (checkbox to include)
 *     [✓] Output Handle (checkbox to include)
 *     [✓] Node background color (color picker)
 *     [✓] Text color (color picker)
 * [✓] Ability to re-select nodes to edit properties
 * [✓] Save/load functionality for flows
 * [✓] Build-mode vs Use-mode separation
 * [✓] Node selection and dragging
 * [✓] Multiple elements of the same type on a node
 * [✓] Interactive toggles and dropdowns in designer
 * [✓] Drag and drop reordering of elements
 */

'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
  MarkerType,
} from '@xyflow/react';
import { nanoid } from 'nanoid';

import '@xyflow/react/dist/style.css';
import './designer.css';

// Custom node components
import CustomNode from './components/CustomNode';
import NodeEditor from './components/NodeEditor';
import EdgeEditor from './components/EdgeEditor';
import FlowToolbar from './components/FlowToolbar';
import SavedFlowsList from './components/SavedFlowsList';
import ElementReorderPanel from './components/ElementReorderPanel';

// Utils
import { 
  saveFlowToDatabase, 
  getFlowsFromDatabase 
} from './utils/flowUtils';

const initialNodes = [
  {
    id: 'example-node',
    type: 'customNode',
    position: { x: 300, y: 100 },
    data: {
      elements: {
        label: {
          visible: true,
          text: 'Example Node'
        },
        textBoxes: [
          {
            visible: true,
            text: 'This is a sample node. Click on it to edit its properties.'
          }
        ],
        toggles: [
          {
            visible: true,
            text: 'Toggle Example',
            value: false
          }
        ],
        dropdowns: [
          {
            visible: true,
            label: 'Select an option:',
            options: ['Option 1', 'Option 2', 'Option 3'],
            selected: 'Option 1'
          }
        ],
        inputFields: [
          {
            visible: true,
            placeholder: 'Type something here...',
            value: ''
          }
        ]
      },
      hasInputHandle: true,
      hasOutputHandle: true,
      bgColor: '#f2f2f2',
      textColor: '#333333',
      state: 'default', // Can be: default, active, double-active
      important: false,
      hasTopInputHandle: false,
      hasBottomInputHandle: false,
      hasTopOutputHandle: false,
      hasBottomOutputHandle: false,
      hasDoubleTopInputHandle: false,
      hasDoubleBottomInputHandle: false,
      hasDoubleBottomOutputHandle: false,
      // Manual sizing properties
      manualSize: false,
      width: 200,
      height: 100
    },
  },
];

const nodeTypes = {};

export default function DesignerPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [originalNodeData, setOriginalNodeData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingEdge, setIsEditingEdge] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingNodeData, setPendingNodeData] = useState(null);
  const [dbFlows, setDbFlows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);
  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const nodeEditorRef = useRef(null);

  // Load flows from database on component mount
  useEffect(() => {
    const fetchFlows = async () => {
      setIsLoading(true);
      const flows = await getFlowsFromDatabase();
      setDbFlows(flows);
      setIsLoading(false);
    };

    fetchFlows();
  }, []);

  // Define the updateNodeData function first
  const updateNodeData = useCallback((nodeId, newData) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: { ...newData },
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  // Define the custom node type with the updateNode prop
  // Memoize to prevent unnecessary re-renders causing the React Flow warning
  const customNodeTypes = useMemo(() => ({
    customNode: (props) => <CustomNode {...props} updateNode={updateNodeData} />
  }), [updateNodeData]); // Dependency array includes updateNodeData

  const onConnect = useCallback(
    (connection) => {
      const newEdge = {
        ...connection,
        id: connection.id || `edge-${connection.source}-${connection.target}-${Date.now()}`,
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  // Check if the node data has changed from its original state 
  const hasNodeDataChanged = useCallback(() => {
    if (!selectedNode || !originalNodeData) return false;
    
    // Deep comparison of node data to original data
    return JSON.stringify(selectedNode.data) !== JSON.stringify(originalNodeData);
  }, [selectedNode, originalNodeData]);

  const onNodeClick = useCallback((event, node) => {
    // If already editing a different node, check if there are unsaved changes
    if (isEditing && selectedNode && selectedNode.id !== node.id) {
      // Only show confirmation if changes were made
      if (hasNodeDataChanged()) {
        setPendingNodeData({
          action: 'select',
          node
        });
        setShowConfirmation(true);
        return;
      }
    }

    // Store the original node data for comparison
    const deepCopy = JSON.parse(JSON.stringify(node.data));
    setOriginalNodeData(deepCopy);
    setSelectedNode(node);
    setIsEditing(true);
    setIsReordering(false);
  }, [isEditing, selectedNode, hasNodeDataChanged]);

  const onPaneClick = useCallback(() => {
    if (isEditing && selectedNode) {
      // Only show confirmation if changes were made
      if (hasNodeDataChanged()) {
        setPendingNodeData({
          action: 'deselect'
        });
        setShowConfirmation(true);
        return;
      }
    }
    
    setSelectedNode(null);
    setSelectedEdge(null);
    setOriginalNodeData(null);
    setIsEditing(false);
    setIsEditingEdge(false);
    setIsReordering(false);
  }, [isEditing, selectedNode, hasNodeDataChanged]);

  // Handle edge click for editing
  const onEdgeClick = useCallback((event, edge) => {
    event.stopPropagation();
    setSelectedNode(null);
    setSelectedEdge(edge);
    setIsEditing(false);
    setIsEditingEdge(true);
    setIsReordering(false);
  }, []);

  // Update individual edge data
  const updateEdgeData = useCallback((edgeId, newEdgeData) => {
    setEdges((eds) =>
      eds.map((edge) => {
        if (edge.id === edgeId) {
          return { ...newEdgeData };
        }
        return edge;
      })
    );
  }, [setEdges]);

  // Bulk update all edges
  const bulkUpdateEdges = useCallback((updates) => {
    setEdges((eds) =>
      eds.map((edge) => ({
        ...edge,
        ...updates,
      }))
    );
  }, [setEdges]);

  const handleConfirmAction = useCallback((confirmed) => {
    setShowConfirmation(false);
    
    if (confirmed && pendingNodeData) {
      if (pendingNodeData.action === 'select') {
        // Proceed with selecting the new node
        const deepCopy = JSON.parse(JSON.stringify(pendingNodeData.node.data));
        setOriginalNodeData(deepCopy);
        setSelectedNode(pendingNodeData.node);
        setIsEditing(true);
        setIsReordering(false);
      } else if (pendingNodeData.action === 'deselect') {
        // Proceed with deselecting
        setSelectedNode(null);
        setOriginalNodeData(null);
        setIsEditing(false);
        setIsReordering(false);
      }
    } else if (!confirmed && selectedNode) {
      // User chose to discard changes, revert to the original node data
      if (nodeEditorRef.current) {
        nodeEditorRef.current.revertChanges();
      }
      
      if (pendingNodeData && pendingNodeData.action === 'select') {
        // Switch to the new node after discarding changes
        const deepCopy = JSON.parse(JSON.stringify(pendingNodeData.node.data));
        setOriginalNodeData(deepCopy);
        setSelectedNode(pendingNodeData.node);
        setIsEditing(true);
        setIsReordering(false);
      }
    }
    
    setPendingNodeData(null);
  }, [pendingNodeData, selectedNode]);

  const createDefaultNodeData = () => {
    return {
      elements: {
        label: {
          visible: true,
          text: 'New Node'
        },
        textBoxes: [],
        toggles: [],
        dropdowns: [],
        inputFields: []
      },
      hasInputHandle: true,
      hasOutputHandle: true,
      bgColor: '#f2f2f2',
      textColor: '#333333',
      state: 'default',
      important: false,
      hasTopInputHandle: false,
      hasBottomInputHandle: false,
      hasTopOutputHandle: false,
      hasBottomOutputHandle: false,
      hasDoubleTopInputHandle: false,
      hasDoubleBottomInputHandle: false,
      hasDoubleBottomOutputHandle: false,
      // Manual sizing properties
      manualSize: false,
      width: 200,
      height: 100
    };
  };

  const addNewNode = useCallback(() => {
    const nodeData = createDefaultNodeData();
    const newNode = {
      id: nanoid(),
      type: 'customNode',
      position: {
        x: Math.random() * 400 + 100,
        y: Math.random() * 400 + 100,
      },
      data: nodeData,
    };

    setNodes((nds) => [...nds, newNode]);
    
    // Select the new node for editing
    setSelectedNode(newNode);
    setOriginalNodeData(JSON.parse(JSON.stringify(nodeData)));
    setIsEditing(true);
    
    return newNode;
  }, [setNodes]);

  const duplicateNode = useCallback((nodeToDuplicate) => {
    if (!nodeToDuplicate) return;
    
    // Create a deep copy of the node data
    const duplicatedData = JSON.parse(JSON.stringify(nodeToDuplicate.data));
    
    // Update label to indicate it's a copy if there is a label
    if (duplicatedData.elements && duplicatedData.elements.label && duplicatedData.elements.label.visible) {
      duplicatedData.elements.label.text = `${duplicatedData.elements.label.text} (Copy)`;
    }
    
    // Create new node with a unique ID and slightly offset position
    const newNode = {
      id: nanoid(),
      type: 'customNode',
      position: {
        x: nodeToDuplicate.position.x + 30,
        y: nodeToDuplicate.position.y + 30,
      },
      data: duplicatedData,
    };
    
    // Add the new node to the flow
    setNodes((nds) => [...nds, newNode]);
    
    // Select the duplicated node for editing
    setSelectedNode(newNode);
    setOriginalNodeData(JSON.parse(JSON.stringify(duplicatedData)));
    setIsEditing(true);
    
    return newNode;
  }, [setNodes]);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handleSaveFlow = useCallback(async (flowName, flowDescription, nodes, edges) => {
    if (!flowName.trim()) return;
    
    // Save to database
    setIsLoading(true);
    const result = await saveFlowToDatabase(flowName, flowDescription, nodes, edges);
    setIsLoading(false);
    
    if (result.success) {
      // Refresh the flows list
      const flows = await getFlowsFromDatabase();
      setDbFlows(flows);
      alert(`Flow "${flowName}" saved successfully to database!`);
    } else {
      alert(`Error saving to database: ${result.error}`);
    }
  }, []);

  const handleLoadFlow = useCallback((flowData) => {
    if (flowData) {
      // Add backward compatibility for manual sizing properties
      const nodesWithDefaults = (flowData.nodes || []).map(node => ({
        ...node,
        data: {
          ...node.data,
          // Add manual sizing properties with defaults if they don't exist
          manualSize: node.data.manualSize || false,
          width: node.data.width || 200,
          height: node.data.height || 100,
          // Add double handle properties with defaults if they don't exist
          hasDoubleTopInputHandle: node.data.hasDoubleTopInputHandle || false,
          hasDoubleBottomInputHandle: node.data.hasDoubleBottomInputHandle || false,
          hasDoubleBottomOutputHandle: node.data.hasDoubleBottomOutputHandle || false
        }
      }));
      
      // Ensure edges have proper IDs for editing
      const edgesWithIds = (flowData.edges || []).map(edge => ({
        ...edge,
        id: edge.id || `edge-${edge.source}-${edge.target}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      }));
      
      setNodes(nodesWithDefaults);
      setEdges(edgesWithIds);
    }
  }, [setNodes, setEdges]);

  const openReorderPanel = useCallback(() => {
    if (selectedNode) {
      setIsEditing(false);
      setIsReordering(true);
    }
  }, [selectedNode]);

  const closeReorderPanel = useCallback(() => {
    setIsReordering(false);
    setIsEditingEdge(false);
  }, []);

  return (
    <div className="designer-container">
      {isEditing && !isReordering && selectedNode && (
        <div className="editor-panel">
          <h2>Edit Node</h2>
          <div className="editor-actions">
            <button 
              className="button button-primary"
              onClick={openReorderPanel}
              disabled={!selectedNode}
            >
              Reorder Elements
            </button>
          </div>
          <NodeEditor 
            ref={nodeEditorRef}
            node={selectedNode} 
            updateNodeData={updateNodeData} 
            isEditing={isEditing}
            setIsEditing={setIsEditing}
            duplicateNode={duplicateNode}
          />
        </div>
      )}

      {isReordering && selectedNode && (
        <div className="editor-panel">
          <h2>Reorder Elements</h2>
          <ElementReorderPanel 
            node={selectedNode} 
            updateNodeData={updateNodeData}
            onClose={closeReorderPanel}
          />
        </div>
      )}

      {isEditingEdge && (
        <div className="editor-panel">
          <h2>Edge Settings</h2>
          <EdgeEditor 
            edge={selectedEdge}
            edges={edges}
            updateEdgeData={updateEdgeData}
            bulkUpdateEdges={bulkUpdateEdges}
            isEditing={isEditingEdge}
            setIsEditing={setIsEditingEdge}
            onClose={() => setIsEditingEdge(false)}
          />
        </div>
      )}

      {!isEditing && !isReordering && !isEditingEdge && (
        <div className="editor-panel node-creation-panel">
          <h2>Create New Node</h2>
          <p>Click the button below to add a new blank node to the canvas. Then click on the node to customize it.</p>
          <button 
            className="button button-primary create-node-button"
            onClick={addNewNode}
          >
            Add New Node
          </button>
          
          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
            <h3 style={{ marginTop: 0, fontSize: '1rem' }}>💡 Tip</h3>
            <p style={{ marginBottom: 0, fontSize: '0.9rem', color: '#6c757d' }}>
              Click on any edge to customize its type, markers, and styling. Use the bulk operations to apply settings to all edges at once.
            </p>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="confirmation-overlay">
          <div className="confirmation-dialog">
            <h3>Save Changes?</h3>
            <p>You have unsaved changes to this node. Would you like to save them?</p>
            <div className="confirmation-buttons">
              <button 
                className="button button-primary" 
                onClick={() => handleConfirmAction(true)}
              >
                Save
              </button>
              <button 
                className="button button-secondary" 
                onClick={() => handleConfirmAction(false)}
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {(isLoading || isTransforming) && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>{isTransforming ? "Transforming your flowchart with AI..." : "Loading..."}</p>
        </div>
      )}

      <div className="flow-container" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onEdgeClick={onEdgeClick}
          nodeTypes={customNodeTypes}
          onInit={setReactFlowInstance}
          onDragOver={onDragOver}
          nodesDraggable={true}
          nodesConnectable={true}
          elementsSelectable={true}
          fitView
          proOptions={{
            hideAttribution: true,
          }}
          snapToGrid={true}
          snapGrid={[10, 10]}
        >
          <Controls />
          <MiniMap />
          <Background variant="dots" gap={12} size={1} />
          
          <Panel position="top-right">
            <FlowToolbar 
              nodes={nodes}
              edges={edges}
              setNodes={setNodes}
              setEdges={setEdges}
              onSave={handleSaveFlow}
              onLoad={handleLoadFlow}
              dbFlows={dbFlows}
              setIsTransforming={setIsTransforming}
            />
          </Panel>
          
          <Panel position="top-left">
            <SavedFlowsList 
              onLoadFlow={handleLoadFlow} 
              dbFlows={dbFlows}
              isLoading={isLoading}
            />
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
}
