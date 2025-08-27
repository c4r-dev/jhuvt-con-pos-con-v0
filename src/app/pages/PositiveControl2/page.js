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
import './PositiveControl2.css';
import { loadSessionFlow, loadSubmissionsForSession } from './utils/validationUtils';
import { getFlowsFromDatabase } from '../PositiveControl1/utils/flowUtils';
import CustomNode from './components/CustomNode';
import Header from "@/app/components/Header/Header";

// Simple node wrapper for display (read-only)
const DisplayNode = ({ ...props }) => {
  const isControlNode = props.data.isControlNode || props.id.startsWith('control-node-');
  const isHighlighted = props.data.highlighted || false;
  
  return (
    <div
      style={{
        border: isHighlighted ? '2px solid #ff6b6b' : 'none',
        borderRadius: '6px',
        minWidth: '150px',
        opacity: 1,
        transform: isControlNode ? 'scale(1.02)' : 'scale(1)',
        boxShadow: isControlNode ? '0 2px 8px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.1)'
      }}
    >
      <CustomNode 
        {...props} 
        updateNode={() => {}}
        data={{
          ...props.data,
          // Ensure control nodes have blue background and white text
          bgColor: isControlNode ? '#e3f2fd' : props.data.bgColor,
          textColor: isControlNode ? '#1976d2' : props.data.textColor
        }}
      />
      {isControlNode && (
        <div style={{
          position: 'absolute',
          top: '-8px',
          right: '-8px',
          background: '#28a745',
          color: 'white',
          borderRadius: '50%',
          width: '20px',
          height: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 'bold'
        }}>
          +
        </div>
      )}
    </div>
  );
};

function PositiveControl2Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const flowId = searchParams.get('flowId');
  const sessionID = searchParams.get('sessionID');
  const reactFlowWrapper = useRef(null);

  // State variables
  const [sessionData, setSessionData] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [activeTab, setActiveTab] = useState('control-groups');
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [hoveredRowId, setHoveredRowId] = useState(null);
  const [currentDisplaySubmissionIndex, setCurrentDisplaySubmissionIndex] = useState(0);

  // ReactFlow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // Debug: Track when nodes change
  useEffect(() => {
    const miceNode = nodes.find(n => n.id === 'node-1-mice');
    if (miceNode) {
      console.log('[PositiveControl2] NODES UPDATED - 16 Mice position:', miceNode.position);
    }
  }, [nodes]);

  // Define node types for display
  const nodeTypes = useMemo(() => ({
    displayNode: DisplayNode
  }), []);

  // Update displayed ReactFlow based on submission index
  const updateDisplayedFlow = useCallback((submissionIndex) => {
    if (submissionIndex < 0 || submissionIndex >= submissions.length) return;
    
    const submission = submissions[submissionIndex];
    if (submission && submission.modifiedFlowData) {
      const displayNodes = submission.modifiedFlowData.nodes.map(node => {
        const isControlNode = node.id.startsWith('control-node-');
        return {
          ...node,
          // Apply same position adjustments as in loadSessionData  
          position: node.id === 'node-1-mice' ? 
            { ...node.position, x: node.position.x - 16 } : 
            node.id === 'node-12-oxidative-stress' ? 
            { ...node.position, x: node.position.x - 10 } :
            node.position,
          type: 'displayNode',
          data: {
            ...node.data,
            isControlNode: isControlNode,
            // Ensure control nodes maintain their blue background and white text
            bgColor: isControlNode ? '#e3f2fd' : node.data.bgColor,
            textColor: isControlNode ? '#1976d2' : node.data.textColor,
            interactiveMode: false, // Read-only mode
            // Add backward compatibility for double handle properties
            hasDoubleTopInputHandle: node.data.hasDoubleTopInputHandle || false,
            hasDoubleBottomInputHandle: node.data.hasDoubleBottomInputHandle || false,
            hasDoubleBottomOutputHandle: node.data.hasDoubleBottomOutputHandle || false
          }
        };
      });
      
      setNodes(displayNodes);
      setEdges(submission.modifiedFlowData.edges || []);
      setCurrentDisplaySubmissionIndex(submissionIndex);
    }
  }, [submissions, setNodes, setEdges]);

  // Format date for display
  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Extract control groups from all submissions
  const extractControlGroups = useCallback(() => {
    const controlGroups = [];
    
    submissions.forEach((submission, submissionIndex) => {
      if (submission.modifiedFlowData && submission.modifiedFlowData.nodes) {
        const controlNodes = submission.modifiedFlowData.nodes.filter(node => 
          node.id.startsWith('control-node-')
        );
        
        controlNodes.forEach(node => {
          controlGroups.push({
            id: node.id,
            submissionIndex: submissionIndex + 1,
            submissionId: submission._id,
            submissionArrayIndex: submissionIndex, // Add this for flow lookup
            title: node.data?.elements?.label?.text || node.data?.label || 'Control Node',
            subtext: node.data?.elements?.textBoxes?.[0]?.text || '',
            position: node.position,
            submissionDate: formatDate(submission.submissionMetadata?.submissionDate || submission.createdAt)
          });
        });
      }
    });
    
    return controlGroups;
  }, [submissions]);

  // Extract validated steps from all submissions
  const extractValidatedSteps = useCallback(() => {
    const validatedSteps = [];
    
    submissions.forEach((submission, submissionIndex) => {
      if (submission.validations && submission.validations.length > 0) {
        submission.validations.forEach((validation, validationIndex) => {
          validatedSteps.push({
            id: `${submission._id}-validation-${validationIndex}`,
            submissionIndex: submissionIndex + 1,
            submissionId: submission._id,
            submissionArrayIndex: submissionIndex, // Add this for flow lookup
            validationText: validation.validationText,
            nodeIds: validation.nodeIds || [],
            nodeLabels: validation.nodeLabels || [],
            timestamp: formatDate(validation.timestamp || submission.createdAt),
            submissionDate: formatDate(submission.submissionMetadata?.submissionDate || submission.createdAt)
          });
        });
      }
    });
    
    return validatedSteps;
  }, [submissions]);

  // Handle row interactions
  const handleRowClick = useCallback((submissionArrayIndex, rowId) => {
    setSelectedRowId(rowId);
    updateDisplayedFlow(submissionArrayIndex);
  }, [updateDisplayedFlow]);

  const handleRowHover = useCallback((submissionArrayIndex, rowId) => {
    if (selectedRowId !== rowId) { // Only update if not already selected
      setHoveredRowId(rowId);
      updateDisplayedFlow(submissionArrayIndex);
    }
  }, [selectedRowId, updateDisplayedFlow]);

  const handleRowLeave = useCallback(() => {
    setHoveredRowId(null);
    // Return to selected row's flow or first submission if none selected
    if (selectedRowId) {
      const selectedRowData = [...extractControlGroups(), ...extractValidatedSteps()].find(
        item => item.id === selectedRowId || `control-${item.id}` === selectedRowId
      );
      if (selectedRowData) {
        updateDisplayedFlow(selectedRowData.submissionArrayIndex);
      }
    } else if (submissions.length > 0) {
      updateDisplayedFlow(0); // Default to first submission
    }
  }, [selectedRowId, submissions.length, updateDisplayedFlow, extractControlGroups, extractValidatedSteps]);

  // Load session flow data
  const loadSessionData = useCallback(async () => {
    if (!sessionID) {
      setError('Session ID is missing from URL.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Load the latest flowchart data directly (like PositiveControl1)
      const dbFlows = await getFlowsFromDatabase();
      const selectedFlowData = dbFlows.find(flow => flow.id === flowId);
      
      if (!selectedFlowData) {
        throw new Error(`Flow with ID ${flowId} not found.`);
      }
      
      const data = selectedFlowData.flowData;
      
      if (data) {
        // Process nodes exactly like PositiveControl1 but for display mode
        const processedNodes = data.nodes.map(node => ({
          ...node,
          // Adjust node positions for PositiveControl2
          position: node.id === 'node-1-mice' ? 
            { ...node.position, x: node.position.x - 16 } : 
            node.id === 'node-12-oxidative-stress' ? 
            { ...node.position, x: node.position.x - 10 } :
            node.position,
          data: {
            ...node.data,
            interactiveMode: false, // Read-only mode for PositiveControl2
            highlighted: false,
            selected: false,
            hasValidation: false,
            // Preserve all handle properties (same as PositiveControl1)
            hasInputHandle: node.id === 'node-7-grip-strength-2' ? true : node.data.hasInputHandle,
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
          type: 'displayNode'
        }));
        
        setNodes(processedNodes);
        setEdges(data.edges || []);
        
        // Debug: Compare ALL node positions with PositiveControl1
        console.log('[PositiveControl2] ALL positions:', 
          Object.fromEntries(processedNodes.map(n => [n.id, n.position]))
        );
        
        // Debug: Check if 16 Mice node exists and its position
        const miceNode = processedNodes.find(n => n.id === 'node-1-mice');
        console.log('[PositiveControl2] INITIAL LOAD - 16 Mice position:', miceNode?.position);
        
      } else {
        throw new Error('Flow data is missing.');
      }
    } catch (err) {
      console.error('Error loading session data:', err);
      setError(err.message || 'An error occurred while loading session data.');
      setSessionData(null);
    } finally {
      setIsLoading(false);
    }
  }, [sessionID, setNodes, setEdges]);

  // Load submissions for the session
  const loadSubmissions = useCallback(async () => {
    if (!sessionID) return;

    setIsLoadingSubmissions(true);
    
    try {
      const result = await loadSubmissionsForSession(sessionID);
      
      if (result.success) {
        setSubmissions(result.data || []);
      } else {
        console.error('Failed to load submissions:', result.message);
        setSubmissions([]);
      }
    } catch (error) {
      console.error('Error loading submissions:', error);
      setSubmissions([]);
    } finally {
      setIsLoadingSubmissions(false);
    }
  }, [sessionID]);

  // Load data on component mount
  useEffect(() => {
    if (!flowId || !sessionID) {
      setError('Flow ID or Session ID is missing from URL.');
      setIsLoading(false);
      return;
    }

    loadSessionData();
    loadSubmissions();
  }, [flowId, sessionID, loadSessionData, loadSubmissions]);

  // Initialize display with first submission when submissions are loaded
  useEffect(() => {
    if (submissions.length > 0 && !selectedRowId && !hoveredRowId) {
      updateDisplayedFlow(0);
    }
  }, [submissions, selectedRowId, hoveredRowId, updateDisplayedFlow]);

  const controlGroups = extractControlGroups();
  const validatedSteps = extractValidatedSteps();


  if (isLoading) {
    return <div className="loading-indicator">Loading session data...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="positive-control-page">
      <Header 
        title="Positive Controls" 
        onLogoClick={() => router.push('/pages/newSession-PC')}
      />
      {/* ReactFlow Display */}
      <div className="reactflow-display-section">
        <div className="reactflow-header">
        </div>
        <div className="reactflow-container" ref={reactFlowWrapper}>
          <ReactFlow
            key={`reactflow-${nodes.length}-${Date.now()}`}
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            fitView={false}
            defaultViewport={{ x: 275, y: 0, zoom: 0.82 }}
            minZoom={0.1}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant="dots" gap={12} size={1} />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>
      </div>

      {/* Tabbed Results Section */}
      <div className="results-section">
        <div className="tab-header">
          <button 
            className={`tab-button ${activeTab === 'control-groups' ? 'active' : ''}`}
            onClick={() => setActiveTab('control-groups')}
          >
            CONTROL GROUPS
          </button>
          <button 
            className={`tab-button ${activeTab === 'steps-validated' ? 'active' : ''}`}
            onClick={() => setActiveTab('steps-validated')}
          >
            STEPS VALIDATED
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'control-groups' && (
            <div className="control-groups-tab">
              {isLoadingSubmissions && (
                <div className="loading-indicator">Loading control groups...</div>
              )}
              
              {!isLoadingSubmissions && controlGroups.length === 0 && (
                <div className="no-data">
                  <p>No control groups were added in the submissions for this session.</p>
                </div>
              )}
              
              {!isLoadingSubmissions && controlGroups.length > 0 && (
                <div className="control-groups-table">
                  <div 
                    className="table-scroll-container"
                    style={{
                      height: '250px',
                      maxHeight: '250px',
                      minHeight: '250px',
                      overflowY: 'scroll',
                      overflowX: 'auto',
                      border: '1px solid black',
                      borderRadius: '6px',
                      boxSizing: 'border-box',
                      backgroundColor: 'white',
                      padding: '10px',
                      width: '100%'
                    }}
                  >
                    <div style={{width: '100%'}}>
                      {/* Header */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 2fr 1fr 1.5fr',
                        gap: '10px',
                        padding: '10px',
                        backgroundColor: '#f8f9fa',
                        fontWeight: '600',
                        borderBottom: '1px solid black',
                        position: 'sticky',
                        top: '0',
                        zIndex: '10'
                      }}>
                        <div>Control Group</div>
                        <div>Description</div>
                        <div>Submission</div>
                        <div>Date Added</div>
                      </div>


                      {/* Data rows */}
                      {controlGroups.map((control, index) => (
                        <div 
                          key={control.id}
                          className={`
                            ${selectedRowId === `control-${control.id}` ? 'selected-row' : ''}
                            ${hoveredRowId === `control-${control.id}` ? 'hovered-row' : ''}
                          `.trim()}
                          onClick={() => handleRowClick(control.submissionArrayIndex, `control-${control.id}`)}
                          onMouseEnter={() => handleRowHover(control.submissionArrayIndex, `control-${control.id}`)}
                          onMouseLeave={handleRowLeave}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '2fr 2fr 1fr 1.5fr',
                            gap: '10px',
                            padding: '10px',
                            cursor: 'pointer',
                            backgroundColor: index % 2 === 0 ? '#fff' : '#f5f5f5',
                            borderBottom: '1px solid black'
                          }}
                        >
                          <div className="control-title">{control.title}</div>
                          <div className="control-description">{control.subtext || '-'}</div>
                          <div className="submission-info">Submission #{control.submissionIndex}</div>
                          <div className="date-info">{control.submissionDate}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'steps-validated' && (
            <div className="steps-validated-tab">
              {isLoadingSubmissions && (
                <div className="loading-indicator">Loading validated steps...</div>
              )}
              
              {!isLoadingSubmissions && validatedSteps.length === 0 && (
                <div className="no-data">
                  <p>No step validations were submitted for this session.</p>
                </div>
              )}
              
              {!isLoadingSubmissions && validatedSteps.length > 0 && (
                <div className="validated-steps-table">
                  <div 
                    className="table-scroll-container"
                    style={{
                      height: '250px',
                      maxHeight: '250px',
                      minHeight: '250px',
                      overflowY: 'scroll',
                      overflowX: 'auto',
                      border: '1px solid black',
                      borderRadius: '6px',
                      boxSizing: 'border-box',
                      backgroundColor: 'white',
                      padding: '10px',
                      width: '100%'
                    }}
                  >
                    <div style={{width: '100%'}}>
                      {/* Header */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '3fr 2fr 1fr 1.5fr',
                        gap: '10px',
                        padding: '10px',
                        backgroundColor: '#f8f9fa',
                        fontWeight: '600',
                        borderBottom: '1px solid black',
                        position: 'sticky',
                        top: '0',
                        zIndex: '10'
                      }}>
                        <div>Validation Text</div>
                        <div>Applied to Nodes</div>
                        <div>Submission</div>
                        <div>Date Validated</div>
                      </div>

                      {/* Data rows */}
                      {validatedSteps.map((step, index) => (
                        <div 
                          key={step.id}
                          className={`
                            ${selectedRowId === step.id ? 'selected-row' : ''}
                            ${hoveredRowId === step.id ? 'hovered-row' : ''}
                          `.trim()}
                          onClick={() => handleRowClick(step.submissionArrayIndex, step.id)}
                          onMouseEnter={() => handleRowHover(step.submissionArrayIndex, step.id)}
                          onMouseLeave={handleRowLeave}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '3fr 2fr 1fr 1.5fr',
                            gap: '10px',
                            padding: '10px',
                            cursor: 'pointer',
                            backgroundColor: index % 2 === 0 ? '#fff' : '#f5f5f5',
                            borderBottom: '1px solid black'
                          }}
                        >
                          <div className="validation-text">{step.validationText}</div>
                          <div className="node-labels">
                            {step.nodeLabels.length > 0 ? step.nodeLabels.join(', ') : 'No nodes specified'}
                          </div>
                          <div className="submission-info">Submission #{step.submissionIndex}</div>
                          <div className="date-info">{step.timestamp}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Actions */}
      <div className="navigation-actions">
        <button
          onClick={() => router.push(`/pages/PositiveControl1?flowId=${flowId}&sessionID=${sessionID}`)}
          className="nav-button secondary"
        >
          Back
        </button>
      </div>
    </div>
  );
}

export default function PositiveControl2Page() {
  return (
    <ReactFlowProvider>
      <Suspense fallback={<div className="loading-indicator">Loading page...</div>}>
        <PositiveControl2Content />
      </Suspense>
    </ReactFlowProvider>
  );
}
