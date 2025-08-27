/**
 * Activity-1 Page
 * 
 * Features:
 * - Interactive viewing of saved flowcharts
 * - Concern entry system for nodes with categorization
 * - Table view of concerns with highlighting functionality
 * - Concern persistence in MongoDB database
 * - Bidirectional node selection between flow view and form
 */

'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ActivityFlowViewer from './components/ActivityFlowViewer';
import ConcernForm from './components/ConcernForm';
import ConcernTable from './components/ConcernTable';
import { getFlowsFromDatabase } from '../designer/utils/flowUtils';
import { getCommentsForFlow } from '../flow-viewer/utils/commentUtils';
import './activity-1.css';

import SessionConfigPopup from '@/app/components/SessionPopup/SessionConfigPopup';
import Header from '@/app/components/Header/Header';

function ActivityContent() {
  const [savedFlows, setSavedFlows] = useState([]);
  const [selectedFlow, setSelectedFlow] = useState(null);
  const [selectedFlowInfo, setSelectedFlowInfo] = useState(null);
  const [flowData, setFlowData] = useState(null);
  const [availableNodes, setAvailableNodes] = useState([]);
  const [concerns, setConcerns] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [concernsLoading, setConcernsLoading] = useState(false);
  const [highlightedNodes, setHighlightedNodes] = useState([]);
  const [selectedNodes, setSelectedNodes] = useState([]);
  const [concernsUpdated, setConcernsUpdated] = useState(0);
  const [showDropdown, setShowDropdown] = useState(true);
  const [sessionId, setSessionId] = useState(null);
  const [showConfigPopup, setShowConfigPopup] = useState(false);
  const [loading, setLoading] = useState(true);
  const concernFormRef = useRef(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const flowIdFromUrl = searchParams.get('flowId');
  const sessionIdFromUrl = searchParams.get('sessionID');
  
  // Default flowID to use when none is provided
  const defaultFlowId = '682f33b87a6b41356cee7202';

  // Generate a random sessionID
  const generateSessionId = () => {
    // Generate a random string using crypto API or fallback
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    } else {
      // Fallback for older browsers
      return 'session-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
    }
  };

  // Handle sessionID and flowID initialization
  useEffect(() => {
    if (!sessionIdFromUrl) {
      // No sessionID in URL, show configuration popup
      setShowConfigPopup(true);
      setLoading(false);
    } else {
      // SessionID exists, store it in state and check flowID
      setSessionId(sessionIdFromUrl);
      setShowConfigPopup(false);
      
      // If no flowID is provided, add the default one
      if (!flowIdFromUrl) {
        const currentUrl = new URL(window.location);
        currentUrl.searchParams.set('sessionID', sessionIdFromUrl);
        currentUrl.searchParams.set('flowId', defaultFlowId);
        
        // Replace the current URL with the default flowID
        router.replace(currentUrl.pathname + currentUrl.search);
        return;
      }
      
      setLoading(false);
    }
  }, [sessionIdFromUrl, flowIdFromUrl, router, defaultFlowId]);

  // Handle popup close - only allow closing if a sessionID exists
  const handleConfigClose = () => {
    if (sessionId) {
      setShowConfigPopup(false);
    }
  };

  // Format date for display
  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Load flows from database on component mount
  useEffect(() => {
    const loadSavedFlows = async () => {
      setIsLoading(true);
      
      // Get database flows only
      let dbFlows = [];
      try {
        dbFlows = await getFlowsFromDatabase();
        setSavedFlows(dbFlows);
        
        // If flowId is in URL, select that flow
        if (flowIdFromUrl && dbFlows.length > 0) {
          const flowExists = dbFlows.some(flow => flow.id === flowIdFromUrl);
          if (flowExists) {
            loadFlowData(flowIdFromUrl, dbFlows);
            setShowDropdown(false);
          }
        }
      } catch (error) {
        console.error('Error loading database flows:', error);
      }
      
      setIsLoading(false);
    };
    
    loadSavedFlows();
  }, [flowIdFromUrl]);

  // Load concerns when flow changes
  useEffect(() => {
    if (selectedFlow && sessionId) {
      loadConcernsForFlow(selectedFlow);
    } else {
      setConcerns([]);
    }
  }, [selectedFlow, sessionId, concernsUpdated]);

  // Load concerns from database
  const loadConcernsForFlow = async (flowId) => {
    if (!sessionId) {
      console.log('No sessionId available, skipping concern loading');
      return;
    }
    
    setConcernsLoading(true);
    try {
      const result = await getCommentsForFlow(flowId, sessionId);
      if (result.success) {
        setConcerns(result.data);
      } else {
        setConcerns([]);
      }
    } catch (error) {
      console.error('Error loading concerns:', error);
      setConcerns([]);
    } finally {
      setConcernsLoading(false);
    }
  };

  // Load flow data 
  const loadFlowData = (flowId, flows) => {
    setSelectedFlow(flowId);
    const selectedFlowData = flows.find(flow => flow.id === flowId);
    
    if (selectedFlowData) {
      setSelectedFlowInfo({
        name: selectedFlowData.name,
        description: selectedFlowData.description,
        nodeCount: selectedFlowData.nodeCount,
        edgeCount: selectedFlowData.edgeCount,
        created: selectedFlowData.timestamp
      });
      
      const data = selectedFlowData.flowData;
      
      if (data) {
        setFlowData(data);
        
        // Extract nodes for concern selection
        if (data.nodes && data.nodes.length > 0) {
          const nodes = data.nodes.map(node => ({
            id: node.id,
            label: node.data.elements.label?.text || `Node ${node.id}`
          }));
          setAvailableNodes(nodes);
        } else {
          setAvailableNodes([]);
        }
      }
    }
  };

  // Handle flow selection
  const handleFlowSelection = (e) => {
    const flowId = e.target.value;
    if (!flowId) {
      setSelectedFlow(null);
      setSelectedFlowInfo(null);
      setFlowData(null);
      setAvailableNodes([]);
      // Preserve sessionID when clearing flowId
      const newUrl = `/pages/activity-1${sessionId ? `?sessionID=${sessionId}` : ''}`;
      router.push(newUrl);
      return;
    }

    // Update URL with flowId and preserve sessionID
    const params = new URLSearchParams();
    if (sessionId) {
      params.set('sessionID', sessionId);
    }
    params.set('flowId', flowId);
    router.push(`/pages/activity-1?${params.toString()}`);
    setShowDropdown(false);
    loadFlowData(flowId, savedFlows);
  };

  // Handle concern updates
  const handleConcernUpdate = useCallback(() => {
    setConcernsUpdated(prev => prev + 1);
  }, []);

  // Handle hovering over a concern in the table
  const handleConcernHover = useCallback((nodeIds) => {
    setHighlightedNodes(nodeIds);
  }, []);

  // Clear highlighted nodes when mouse leaves
  const handleConcernLeave = useCallback(() => {
    setHighlightedNodes([]);
  }, []);

  // Handle node selection from the flow diagram
  const handleNodeSelect = useCallback((nodeId, nodeLabel) => {
    if (concernFormRef.current && concernFormRef.current.handleNodeSelect) {
      concernFormRef.current.handleNodeSelect(nodeId, nodeLabel);
    }
  }, []);

  // Handle node selection changes from the form
  const handleNodeSelectionChange = useCallback((nodeIds) => {
    setSelectedNodes(nodeIds);
  }, []);

  // Handle navigation to word cloud page
  const handleContinue = () => {
    if (selectedFlow) {
      const params = new URLSearchParams();
      if (sessionId) {
        params.set('sessionID', sessionId);
      }
      params.set('flowId', selectedFlow);
      router.push(`/pages/activity-2?${params.toString()}`);
    }
  };

  // Show loading while waiting for session configuration
  if (loading && sessionId) {
    return (
      <div className="activity-page">
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>Loading Activity 1...</p>
        </div>
      </div>
    );
  }

  // Show session configuration popup
  if (showConfigPopup || !sessionId) {
    return (
      <>
        <SessionConfigPopup 
          open={showConfigPopup}
          onClose={handleConfigClose}
          sessionID={sessionId}
          targetPage="activity-1"
          defaultFlowId={defaultFlowId}
        />
        <div className="activity-page">
          <div className="loading-indicator">
            <div className="spinner"></div>
            <p>Configuring your session...</p>
          </div>
        </div>
      </>
    );
  }

  const handleLogoClick = () => {
    router.push('/pages/newSession-NS');
  };

  return (
    <div className="activity-page">
      <Header title="Neuroserpin" onLogoClick={handleLogoClick} />
      <div className="activity-header-0">
        {showDropdown && (
          <div className="flow-selection">
            <select 
              value={selectedFlow || ''} 
              onChange={handleFlowSelection}
              className="flow-select"
            >
              <option value="">Select a flow to view</option>
              {savedFlows.map((flow) => (
                <option key={flow.id} value={flow.id}>
                  {flow.name} ({flow.nodeCount} nodes, {flow.edgeCount} edges)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>Loading flows...</p>
        </div>
      )}

      {/* {selectedFlowInfo && (
        <div className="selected-flow-info">
          <h2>{selectedFlowInfo.name}</h2>
          <div className="flow-date">Created: {formatDate(selectedFlowInfo.created)}</div>
          {selectedFlowInfo.description && (
            <p className="flow-description">{selectedFlowInfo.description}</p>
          )}
        </div>
      )} */}

      {/* Side-by-side layout */}
      {flowData ? (
        <div className="content-container">
          {/* Left panel: Concern Form and Table */}
          <div className="left-panel">
            <div className="concern-form-container">
              <ConcernForm 
                ref={concernFormRef}
                flowName={selectedFlow}
                sessionId={sessionId}
                availableNodes={availableNodes}
                onConcernUpdate={handleConcernUpdate}
                onNodeSelectionChange={handleNodeSelectionChange}
              />
            </div>
            
            <div className="concern-table-container">
              <ConcernTable 
                concerns={concerns}
                isLoading={concernsLoading}
                onConcernHover={handleConcernHover}
                onConcernLeave={handleConcernLeave}
                onConcernUpdate={handleConcernUpdate}
              />
            </div>
          </div>
          
          {/* Right panel: ReactFlow */}
          <div className="right-panel">
            <div className="flow-container">
              <ActivityFlowViewer 
                key={`${selectedFlow}-${concernsUpdated}`}
                flowData={flowData} 
                flowName={selectedFlow}
                highlightedNodes={highlightedNodes}
                selectedNodes={selectedNodes}
                onNodeSelect={handleNodeSelect}
              />
            </div>
          </div>
        </div>
      ) : (
        !isLoading && (
          <div className="no-flow-selected">
            <p>Please select a flow to view from the dropdown above.</p>
          </div>
        )
      )}
      
      {selectedFlow && (
        <div className="continue-button-container">
          <button 
            onClick={handleContinue}
            className="button button-primary continue-button"
            disabled={concerns.length === 0}
            title={concerns.length === 0 ? "Please add at least one concern before continuing" : ""}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default function Activity1Page() {
  return (
    <Suspense fallback={<div className="loading-indicator"><div className="spinner"></div><p>Loading...</p></div>}>
      <ActivityContent />
    </Suspense>
  );
}