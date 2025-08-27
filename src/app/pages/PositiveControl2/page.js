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
import CustomNode from '../designer/components/CustomNode';
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
        opacity: isControlNode ? 1 : 0.7,
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
      console.log(`[PositiveControl2] Loading session data for: ${sessionID}`);
      const result = await loadSessionFlow(sessionID);
      
      if (result.success && result.data) {
        setSessionData(result.data);
        
        // Set up ReactFlow display with session data
        if (result.data.modifiedFlowData) {
          const displayNodes = result.data.modifiedFlowData.nodes.map(node => {
            const isControlNode = node.id.startsWith('control-node-');
            return {
              ...node,
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
          setEdges(result.data.modifiedFlowData.edges || []);
        }
        
        console.log(`[PositiveControl2] Session data loaded successfully`);
      } else {
        throw new Error(result.message || 'Failed to load session data');
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
      console.log(`[PositiveControl2] Loading submissions for session: ${sessionID}`);
      console.log(`[PositiveControl2] API URL: /api/positive-control-submissions/session/${sessionID}`);
      
      const result = await loadSubmissionsForSession(sessionID);
      
      console.log(`[PositiveControl2] API response:`, result);
      
      if (result.success) {
        setSubmissions(result.data || []);
        console.log(`[PositiveControl2] Found ${result.data?.length || 0} submissions`);
        console.log(`[PositiveControl2] Submissions data:`, result.data);
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

  // Debug logging to check data availability
  console.log('[PositiveControl2] Control Groups count:', controlGroups.length);
  console.log('[PositiveControl2] Control Groups data:', controlGroups);
  console.log('[PositiveControl2] Submissions count:', submissions.length);
  console.log('[PositiveControl2] Submissions data:', submissions);

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
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            nodesDraggable={false}
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
