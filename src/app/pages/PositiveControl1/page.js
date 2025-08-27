'use client';

import React, { useState, useEffect, useCallback, Suspense, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { getFlowsFromDatabase } from '../designer/utils/flowUtils';
import './PositiveControl1.css';
import { saveSessionFlow, loadSessionFlow, submitPositiveControlWork } from './utils/validationUtils';
import CustomNode from '../designer/components/CustomNode';
import Header from "@/app/components/Header/Header";

// Wrapper component for CustomNode with highlighting
const HighlightableNode = ({ updateNodeData, ...props }) => {
  const isHighlighted = props.data.highlighted || false;
  const isSelected = props.data.selected || false;
  const hasValidation = props.data.hasValidation || false;
  const [isHovered, setIsHovered] = useState(false);
  
  const borderStyle = isSelected
    ? '4px solid #4287f5'
    : isHovered
    ? '2px solid #7aacff'
    : isHighlighted
    ? '4px solid #ff6b6b'
    : 'none';
  
  const boxShadowStyle = isSelected
    ? '0 0 15px rgba(66, 135, 245, 0.8)'
    : isHovered
    ? '0 0 8px rgba(122, 170, 255, 0.5)'
    : isHighlighted
    ? '0 0 15px rgba(255, 107, 107, 0.8)'
    : 'none';
  
  return (
    <div
      style={{
        border: borderStyle,
        borderRadius: '6px',
        boxShadow: boxShadowStyle,
        transform: (isHighlighted || isSelected || isHovered) ? 'scale(1.03)' : 'scale(1)',
        transition: 'all 0.2s ease-in-out',
        zIndex: (isHighlighted || isSelected || isHovered) ? 1000 : 'auto',
        position: 'relative'
      }}
      onMouseEnter={() => {
        if (!isSelected) {
          setIsHovered(true);
        }
      }}
      onMouseLeave={() => {
        setIsHovered(false);
      }}
    >
      <CustomNode {...props} updateNode={updateNodeData} />
      {isHighlighted && !isSelected && !isHovered && (
        <div style={{
          position: 'absolute',
          top: '-10px',
          right: '-10px',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          backgroundColor: '#ff6b6b',
          border: '2px solid white',
          boxShadow: '0 0 5px rgba(0,0,0,0.3)',
          zIndex: 1001
        }} />
      )}
      {isSelected && (
        <div style={{
          position: 'absolute',
          top: '-10px',
          right: '-10px',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          backgroundColor: '#4287f5',
          border: '2px solid white',
          boxShadow: '0 0 5px rgba(0,0,0,0.3)',
          zIndex: 1001
        }} />
      )}
      {hasValidation && !isSelected && (
        <div style={{
          position: 'absolute',
          top: '-10px',
          left: '-10px',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          backgroundColor: '#FFD700',
          border: '2px solid white',
          boxShadow: '0 0 5px rgba(0,0,0,0.3)',
          zIndex: 1001,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          fontWeight: 'bold',
          color: '#8B4513'
        }}>
          ✓
        </div>
      )}
    </div>
  );
};

function PositiveControlContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const flowId = searchParams.get('flowId');
  const sessionID = searchParams.get('sessionID');
  const reactFlowWrapper = useRef(null);
  const reactFlowInstance = useReactFlow();

  // State variables
  const [flowData, setFlowData] = useState(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFlowInfo, setSelectedFlowInfo] = useState(null);
  
  const [inputType, setInputType] = useState('addControl');
  const [controlText, setControlText] = useState('');
  const [controlSubtext, setControlSubtext] = useState('');
  const [selectedNodesForValidation, setSelectedNodesForValidation] = useState([]);
  const [validationText, setValidationText] = useState('');
  const [allNodesForSelection, setAllNodesForSelection] = useState([]);
  const [isSubmittingValidation, setIsSubmittingValidation] = useState(false);
  const [validations, setValidations] = useState([]);
  const [isLoadingValidations, setIsLoadingValidations] = useState(false);
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [isSubmittingWork, setIsSubmittingWork] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(sessionID || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  // Format date for display (same as in activity-1)
  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Update node data 
  const updateNodeData = useCallback((nodeId, newData) => {
    setNodes(nds =>
      nds.map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: { 
              ...newData,
              highlighted: node.data.highlighted,
              selected: node.data.selected,
              hasValidation: node.data.hasValidation
            },
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  // Define custom node types
  const nodeTypes = useMemo(() => ({
    highlightableNode: (props) => <HighlightableNode {...props} updateNodeData={updateNodeData} />
  }), [updateNodeData]);

  // Save session flow data 
  const saveCurrentSessionFlow = useCallback(async () => {
    if (!flowId || !selectedFlowInfo) return;
    
    const modifiedFlowData = {
      nodes: nodes,
      edges: edges
    };

    try {
      console.log(`[SessionFlow] Saving session ${currentSessionId} for flow ${flowId}`);
      const result = await saveSessionFlow(
        currentSessionId,
        flowId,
        selectedFlowInfo.name,
        modifiedFlowData,
        validations
      );
      
      if (!result.success) {
        console.error('Failed to save session flow:', result.message);
      } else {
        console.log(`[SessionFlow] Successfully saved session ${currentSessionId}`);
      }
    } catch (error) {
      console.error('Error saving session flow:', error);
    }
  }, [currentSessionId, flowId, selectedFlowInfo, nodes, edges, validations]);

  // Load session flow if sessionID exists, otherwise load original flow
  const loadFlowData = useCallback(async () => {
    if (!flowId) {
      alert('Flow ID is missing from URL.');
      setIsLoading(false);
      setError('Flow ID is missing.');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Always load original flow from database first
      // SessionID is only used for saving user modifications, not for loading initial state
      const dbFlows = await getFlowsFromDatabase();
      const selectedFlowData = dbFlows.find(flow => flow.id === flowId);
      
      if (!selectedFlowData) {
        throw new Error(`Flow with ID ${flowId} not found.`);
      }
      
      // Set selected flow info
      setSelectedFlowInfo({
        name: selectedFlowData.name,
        description: selectedFlowData.description,
        nodeCount: selectedFlowData.nodeCount,
        edgeCount: selectedFlowData.edgeCount,
        created: selectedFlowData.timestamp
      });
      
      // Set flow data 
      const data = selectedFlowData.flowData;
      
      if (data) {
        setFlowData(data);
        setValidations([]); // Start with no validations - they will be created during the session
        
        // Process nodes to add necessary properties
        const processedNodes = data.nodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            interactiveMode: true,
            highlighted: false,
            selected: false,
            hasValidation: false,
            // Preserve all handle properties
            hasInputHandle: node.data.hasInputHandle,
            hasOutputHandle: node.data.hasOutputHandle,
            hasTopInputHandle: node.id === 'node-5-grip-strength-1' ? true : node.data.hasTopInputHandle,
            hasBottomInputHandle: node.data.hasBottomInputHandle,
            hasTopOutputHandle: node.data.hasTopOutputHandle,
            hasBottomOutputHandle: node.data.hasBottomOutputHandle,
            // Add backward compatibility for double handle properties
            hasDoubleTopInputHandle: node.data.hasDoubleTopInputHandle || false,
            hasDoubleBottomInputHandle: node.data.hasDoubleBottomInputHandle || false,
            hasDoubleBottomOutputHandle: node.data.hasDoubleBottomOutputHandle || false
          },
          type: 'highlightableNode'
        }));
        
        setNodes(processedNodes);
        setEdges(data.edges || []);
      } else {
        throw new Error('Flow data is missing.');
      }
    } catch (err) {
      console.error('Error loading flow:', err);
      setError(err.message || 'An error occurred while fetching the flow.');
      setFlowData(null);
      setNodes([]);
      setEdges([]);
    } finally {
      setIsLoading(false);
    }
  }, [flowId, setNodes, setEdges]);

  // Load flows from database on component mount
  useEffect(() => {
    loadFlowData();
  }, [loadFlowData]);

  // Update available nodes when nodes change
  useEffect(() => {
    // Update the list of all nodes available for selection whenever `nodes` state changes
    // This ensures newly D&D'd nodes are also available in the multiselect
    setAllNodesForSelection(nodes.map(n => ({ 
      id: n.id, 
      label: n.data?.elements?.label?.text || n.data?.label || `Node ${n.id}` 
    })));
  }, [nodes]);

  // Connect two nodes with an edge
  const onConnect = useCallback((params) => {
    setEdges((eds) => {
      const updatedEdges = [...eds, { ...params, id: `edge-${Date.now()}` }];
      
      // Auto-save session flow when edge is added
      setTimeout(() => {
        if (selectedFlowInfo) {
          console.log(`[SessionFlow] Auto-saving after edge addition`);
          const modifiedFlowData = {
            nodes: nodes,
            edges: updatedEdges
          };
          
          saveSessionFlow(
            currentSessionId,
            flowId,
            selectedFlowInfo.name,
            modifiedFlowData,
            validations
          ).catch(error => {
            console.error('Error auto-saving session flow:', error);
          });
        }
      }, 100);
      
      return updatedEdges;
    });
  }, [setEdges, nodes, currentSessionId, flowId, selectedFlowInfo, validations]);

  // Handle adding control to diagram
  const handleAddControlToDiagram = () => {
    if (!controlText.trim()) {
        alert("Please enter text for the control group.");
        return;
      }

    // Find existing control groups to determine positioning
    const existingControlGroups = nodes.filter(node => 
      node.id === 'node-3-als-group-1' || 
      node.id === 'node-4-als-swim-group' || 
      node.id.startsWith('control-node-')
    );
    
    // Calculate position for new control group
    // Get actual position from ALS I Group node
    const alsIGroupNode = nodes.find(n => n.id === 'node-3-als-group-1');
    const alsIGroupX = alsIGroupNode ? alsIGroupNode.position.x : 50;
    const yPosition = alsIGroupNode ? alsIGroupNode.position.y : 300;
    
    // Place new groups to the left of ALS I Group with 200px spacing
    const spacing = 200;
    // Count only the control-node- entries to determine how many are already added
    const addedControlNodes = existingControlGroups.filter(node => node.id.startsWith('control-node-')).length;
    const newX = alsIGroupX - ((addedControlNodes + 1) * spacing);
    
    const newNodeId = `control-node-${Date.now()}`;
    const newNode = {
      id: newNodeId,
      type: 'highlightableNode',
      position: { x: newX, y: yPosition },
      data: { 
        label: controlText,
        elements: {
          label: {
            text: controlText,
            visible: true
          },
          textBoxes: controlSubtext ? [
            {
              text: controlSubtext,
              visible: true
            }
          ] : []
        },
        highlighted: false,
        selected: false,
        interactiveMode: true,
        hasValidation: false,
        hasInputHandle: false,
        hasOutputHandle: false,
        hasTopInputHandle: true,
        hasBottomInputHandle: false,
        hasTopOutputHandle: false,
        hasBottomOutputHandle: true,
        hasDoubleTopInputHandle: false,
        hasDoubleBottomInputHandle: false,
        hasDoubleBottomOutputHandle: false,
        bgColor: '#e3f2fd',
        textColor: '#1976d2',
        isControlNode: true
      }
    };

    // Find the Randomized Assignment and Grip Strength nodes for connections
    const randomizedAssignmentNode = nodes.find(n => n.id === 'node-2-random-assignment');
    const gripStrengthNode = nodes.find(n => n.id === 'node-5-grip-strength-1');
    
    
    
    const newEdges = [];
    
    // Create edge from Randomized Assignment to new control group
    if (randomizedAssignmentNode) {
      const edgeToNew = {
        id: `edge-randomized-${newNodeId}`,
        source: 'node-2-random-assignment',
        sourceHandle: 'output-bottom',
        target: newNodeId,
        targetHandle: 'input-top',
        type: 'default',
        style: { stroke: '#000', strokeWidth: 2 },
        markerEnd: {
          type: 'arrowclosed',
          color: '#000',
          width: 20,
          height: 20
        }
      };
      newEdges.push(edgeToNew);
    }
    
    // Create edge from new control group to Grip Strength
    if (gripStrengthNode) {
      const edgeToGrip = {
        id: `edge-${newNodeId}-grip`,
        source: newNodeId,
        sourceHandle: 'output-bottom', 
        target: 'node-5-grip-strength-1',
        targetHandle: 'input-top',
        type: 'default',
        style: { stroke: '#000', strokeWidth: 2 },
        markerEnd: {
          type: 'arrowclosed',
          color: '#000',
          width: 20,
          height: 20
        }
      };
      newEdges.push(edgeToGrip);
    }
    

    // Add the new node
    setNodes(nds => {
      const updatedNodes = [...nds, newNode];
      return updatedNodes;
    });
    
    // Add the new edges
    setEdges(eds => {
        const updatedEdges = [...eds, ...newEdges];
      
      // Auto-save session flow when node and edges are added
      setTimeout(() => {
        if (selectedFlowInfo) {
          console.log(`[SessionFlow] Auto-saving after control group addition`);
          const modifiedFlowData = {
            nodes: [...nodes, newNode],
            edges: updatedEdges
          };
          
          saveSessionFlow(
            currentSessionId,
            flowId,
            selectedFlowInfo.name,
            modifiedFlowData,
            validations
          ).catch(error => {
            console.error('Error auto-saving session flow:', error);
          });
        }
      }, 100);
      
      return updatedEdges;
    });
    
    // Clear the input fields
    setControlText('');
    setControlSubtext('');
  };

  // Node selection for validation
  const handleNodeClick = useCallback((event, node) => {
    setSelectedNodesForValidation(prevSelected => {
      const isSelected = prevSelected.find(n => n.id === node.id);
      if (isSelected) {
        return prevSelected.filter(n => n.id !== node.id);
      } else {
        // Get the node label from the appropriate structure
        const nodeLabel = node.data?.elements?.label?.text || 
                        node.data?.label || 
                        `Node ${node.id}`;
        return [...prevSelected, { id: node.id, label: nodeLabel }];
      }
    });
    
    // Update node selection state in the flow
    setNodes(nds => 
      nds.map(n => {
        if (n.id === node.id) {
          return {
            ...n,
            data: {
              ...n.data,
              selected: !n.data.selected,
            }
          };
        }
        return n;
      })
    );
  }, [setNodes]);

  const handleMultiselectChange = (event) => {
    const selectedOptions = Array.from(event.target.selectedOptions).map(option => {
        const node = allNodesForSelection.find(n => n.id === option.value);
        return node; // Store the whole node object {id, label}
    });
    
    const selectedOptionIds = selectedOptions.filter(Boolean).map(opt => opt.id);
    
    setSelectedNodesForValidation(selectedOptions.filter(Boolean));
    
    // Update node selection state in the flow
    setNodes(nds => 
      nds.map(n => {
        return {
          ...n,
          data: {
            ...n.data,
            selected: selectedOptionIds.includes(n.id),
          }
        };
      })
    );
  };

  const handleSubmitValidation = async () => {
    if (selectedNodesForValidation.length === 0) {
      return;
    }
    if (!validationText.trim()) {
      return;
    }

    setIsSubmittingValidation(true);

    try {
      const nodeIds = selectedNodesForValidation.map(n => n.id);
      const nodeLabels = selectedNodesForValidation.map(n => n.label);
      
      // Add new validation to existing validations
      const newValidation = {
        nodeIds,
        nodeLabels,
        validationText,
        timestamp: new Date()
      };
      
      const updatedValidations = [...validations, newValidation];
      setValidations(updatedValidations);
      
      // Update nodes to show validation indicators
      setNodes(nds => 
        nds.map(n => ({
          ...n,
          data: {
            ...n.data,
            hasValidation: nodeIds.includes(n.id) || n.data.hasValidation,
            selected: false,
          }
        }))
      );
      
      // Save the updated session flow
      const modifiedFlowData = {
        nodes: nodes.map(n => ({
          ...n,
          data: {
            ...n.data,
            hasValidation: nodeIds.includes(n.id) || n.data.hasValidation,
            selected: false,
          }
        })),
        edges: edges
      };
      
      const result = await saveSessionFlow(
        currentSessionId,
        flowId,
        selectedFlowInfo.name,
        modifiedFlowData,
        updatedValidations
      );
      
      if (result.success) {
        setValidationText('');
        setSelectedNodesForValidation([]);
      } else {
        setValidations(validations);
      }
    } catch (error) {
      console.error('Error during validation submission:', error);
      setValidations(validations);
    } finally {
      setIsSubmittingValidation(false);
    }
  };

  // Handle comprehensive submission of all work
  const handleSubmitPositiveControlWork = async () => {
    if (!flowData || !selectedFlowInfo) {
      alert('No flow data available to submit.');
      return;
    }

    // Save current session flow first
    await saveCurrentSessionFlow();

    // Prepare the current flow data with all modifications
    const currentFlowData = {
      nodes: nodes,
      edges: edges
    };

    // Prepare validation data
    const validationData = validations.map(validation => ({
      nodeIds: validation.nodeIds || [],
      nodeLabels: validation.nodeLabels || [],
      validationText: validation.validationText,
      timestamp: validation.timestamp
    }));

    const submissionData = {
      originalFlowId: flowId,
      originalFlowName: selectedFlowInfo.name,
      modifiedFlowData: currentFlowData,
      validations: validationData,
      notes: submissionNotes,
      sessionId: currentSessionId // Include session ID for reference
    };

    console.log(`[PositiveControl1] Submitting data with sessionId: ${currentSessionId}`);
    console.log(`[PositiveControl1] Submission data:`, submissionData);

    setIsSubmittingWork(true);

    try {
      const result = await submitPositiveControlWork(submissionData);
      
      if (result.success) {
        // alert(`Positive control work submitted successfully!\nSubmission ID: ${result.data.submissionId}\nSession ID: ${currentSessionId}\nTotal nodes: ${result.data.metadata.totalNodes}\nAdded controls: ${result.data.metadata.addedControlNodes}\nValidations: ${result.data.metadata.totalValidations}`);
        setSubmissionNotes(''); // Clear notes after successful submission
        
        // Redirect to PositiveControl2 page with flowId and sessionID
        router.push(`/pages/PositiveControl2?flowId=${flowId}&sessionID=${currentSessionId}`);
      } else {
        alert(`Error submitting work: ${result.message}`);
      }
    } catch (error) {
      console.error('Error during work submission:', error);
      alert(`Error submitting work: ${error.message}`);
    } finally {
      setIsSubmittingWork(false);
    }
  };

  if (isLoading) {
    return <div className="loading-indicator">Loading flow...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }
  
  if (!flowData && !isLoading) {
    return <div className="error-message">No flow data to display. Ensure the flow ID is correct or the flow exists.</div>;
  }

  return (
    <div className="positive-control-page">
      <Header 
        title="Positive Controls" 
        onLogoClick={() => router.push('/pages/newSession-PC')}
      />
      <div className="session-info">
        <div className="session-id">Session ID: {currentSessionId}</div>
        {selectedFlowInfo && (
          <div className="flow-info">
            <span>Flow: {selectedFlowInfo.name}</span>
            <span>Nodes: {nodes.length}</span>
            <span>Validations: {validations.length}</span>
          </div>
        )}
      </div>

      {/* {selectedFlowInfo && (
        <div className="selected-flow-info">
          <h2>{selectedFlowInfo.name}</h2>
          <div className="flow-date">Created: {formatDate(selectedFlowInfo.created)}</div>
          {selectedFlowInfo.description && (
            <p className="flow-description">{selectedFlowInfo.description}</p>
          )}
        </div>
      )} */}

      <div className="instructions-section">
        <p>Add positive controls to this experimental flow by typing in the input field below and clicking &quot;ADD TO DIAGRAM&quot;. New control groups will be automatically positioned in the flow alongside the existing ALS I Group and ALS I SWIM Group, with proper connections to Randomized Assignment and Grip Strength.</p>
      </div>

      <div className="reactflow-container" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          // onConnect={onConnect} // Disabled - we create edges programmatically
          onNodeClick={handleNodeClick}
          nodeTypes={nodeTypes}
          nodesDraggable={true}
          nodesConnectable={false}
          elementsSelectable={false}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background variant="dots" gap={12} size={1} />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>

      <div className="input-area-container">
        <div className="input-content">
          <div className="input-type-selector">
            <select value={inputType} onChange={(e) => setInputType(e.target.value)}>
              <option value="addControl">Add a control group</option>
              <option value="validateStep">Validate a step</option>
            </select>
          </div>

          {inputType === 'addControl' && (
            <div className="add-control-form">
              <input 
                type="text"
                placeholder="Add a positive control to the experiment..."
                value={controlText}
                onChange={(e) => setControlText(e.target.value)}
              />
              <input
                type="text"
                placeholder="Additional subtext (optional)"
                value={controlSubtext}
                onChange={(e) => setControlSubtext(e.target.value)}
              />
              <div className="button-container">
                <button 
                  className="add-to-diagram-btn" 
                  onClick={handleAddControlToDiagram}
                >
                  ADD TO DIAGRAM
                </button>
              </div>
            </div>
          )}

          {inputType === 'validateStep' && (
            <div className="validate-step-form">
              <label htmlFor="node-multiselect">Select Node(s) for Validation:</label>
              <select 
                id="node-multiselect"
                multiple 
                value={selectedNodesForValidation.map(n => n.id)}
                onChange={handleMultiselectChange}
                className="node-multiselect-dropdown"
              >
                {allNodesForSelection.map(node => (
                  <option key={node.id} value={node.id}>
                    {node.label}
                  </option>
                ))}
              </select>
              {selectedNodesForValidation.length > 0 && (
                <p>Selected: {selectedNodesForValidation.map(n => n.label).join(', ' )}</p>
              )}
              <textarea 
                placeholder="Enter validation text for selected node(s)..."
                value={validationText}
                onChange={(e) => setValidationText(e.target.value)}
              />
              <div className="button-container">
                <button className="add-to-diagram-btn" onClick={handleSubmitValidation} disabled={isSubmittingValidation}>
                  {isSubmittingValidation ? 'Adding...' : 'Add Validation'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* <div className="validations-display-area">
        <h3>Applied Validations</h3>
        {isLoadingValidations && <p>Loading validations...</p>}
        {!isLoadingValidations && validations.length === 0 && (
          <p>No validations have been applied yet.</p>
        )}
        {!isLoadingValidations && validations.length > 0 && (
          <div className="validations-list">
            {validations.map((validation, index) => {
              const nodeLabels = validation.nodeIds?.map(nodeId => {
                const node = allNodesForSelection.find(n => n.id === nodeId);
                return node ? node.label : `Node ${nodeId}`;
              }) || [];
              
              return (
                <div key={index} className="validation-item">
                  <div className="validation-header">
                    <span className="validation-badge">✓</span>
                    <span className="validation-nodes">
                      Applied to: {nodeLabels.join(', ')}
                    </span>
                    <span className="validation-date">
                      {validation.timestamp ? new Date(validation.timestamp).toLocaleDateString() : 'Unknown date'}
                    </span>
                  </div>
                  <div className="validation-text">
                    {validation.validationText || validation.text || 'No validation text provided'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div> */}

      {/* <div className="comprehensive-submission-area">
        <h3>Submit Positive Control Work</h3>
        <p>Submit your complete positive control analysis including all added control nodes and validations.</p>
        
        <div className="submission-summary">
          <div className="summary-stats">
            <span>Total Nodes: {nodes.length}</span>
            <span>Added Controls: {nodes.filter(n => n.id.startsWith('control-node-')).length}</span>
            <span>Validations: {validations.length}</span>
          </div>
        </div>
        
        <div className="submission-notes">
          <label htmlFor="submission-notes">Additional Notes (Optional):</label>
          <textarea
            id="submission-notes"
            placeholder="Add any additional notes about your positive control analysis..."
            value={submissionNotes}
            onChange={(e) => setSubmissionNotes(e.target.value)}
            rows={3}
          />
        </div>
        
        <div className="submission-actions">
          <button 
            onClick={handleSubmitPositiveControlWork}
            disabled={isSubmittingWork || nodes.length === 0}
            className="submit-work-button"
          >
            {isSubmittingWork ? 'Submitting Work...' : 'Submit Complete Analysis'}
          </button>
        </div>
      </div> */}

      {/* Control groups are now automatically added to the diagram */}

      <div className="submission-actions">
          <button 
            onClick={handleSubmitPositiveControlWork}
            disabled={isSubmittingWork || nodes.length === 0}
            className="submit-work-button"
          >
            {isSubmittingWork ? 'Submitting Work...' : 'SUBMIT'}
          </button>
        </div>
    </div>
  );
}

export default function PositiveControl1Page() {
  return (
    <ReactFlowProvider>
      <Suspense fallback={<div className="loading-indicator">Loading page details...</div>}>
        <PositiveControlContent />
      </Suspense>
    </ReactFlowProvider>
  );
}
