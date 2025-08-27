/**
 * Flow Viewer Page
 * 
 * Features:
 * - Interactive viewing of saved flowcharts
 * - Comment/annotation system for nodes with categorization
 * - User interaction with node elements (toggles, inputs, dropdowns)
 * - Comment persistence in MongoDB database
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import FlowViewer from './components/FlowViewer';
import CommentSection from './components/CommentSection';
import { getFlowsFromDatabase } from '../designer/utils/flowUtils';
import './flow-viewer.css';

export default function FlowViewerPage() {
  const [savedFlows, setSavedFlows] = useState([]);
  const [selectedFlow, setSelectedFlow] = useState(null);
  const [selectedFlowInfo, setSelectedFlowInfo] = useState(null);
  const [flowData, setFlowData] = useState(null);
  const [availableNodes, setAvailableNodes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [commentUpdated, setCommentUpdated] = useState(0); // Counter to trigger comment reloads
  const router = useRouter();

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
      } catch (error) {
        console.error('Error loading database flows:', error);
      }
      
      setIsLoading(false);
    };
    
    loadSavedFlows();
  }, []);

  // Load flow data when a flow is selected
  const handleFlowSelection = (e) => {
    const flowId = e.target.value;
    if (!flowId) {
      setSelectedFlow(null);
      setSelectedFlowInfo(null);
      setFlowData(null);
      setAvailableNodes([]);
      return;
    }

    setSelectedFlow(flowId);
    const selectedFlowData = savedFlows.find(flow => flow.id === flowId);
    
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
        
        // Extract nodes for comment selection
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

  // Force comment reload
  const handleCommentUpdate = () => {
    setCommentUpdated(prev => prev + 1);
  };

  const goToDesigner = () => {
    router.push('/pages/designer');
  };

  return (
    <div className="flow-viewer-container">
      <div className="viewer-header">
        <h1>Flow Viewer</h1>
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
          <button className="button button-primary" onClick={goToDesigner}>
            Open Designer
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>Loading flows...</p>
        </div>
      )}

      {selectedFlowInfo && (
        <div className="selected-flow-info">
          <h2>{selectedFlowInfo.name}</h2>
          <div className="flow-date">Created: {formatDate(selectedFlowInfo.created)}</div>
          {selectedFlowInfo.description && (
            <p className="flow-description">{selectedFlowInfo.description}</p>
          )}
          <div className="flow-stats">
            <span>{selectedFlowInfo.nodeCount} nodes</span>
            <span>{selectedFlowInfo.edgeCount} edges</span>
          </div>
        </div>
      )}

      <div className="viewer-content">
        <div className="flow-display interactive-flow">
          {flowData ? (
            <FlowViewer 
              key={`${selectedFlow}-${commentUpdated}`}
              flowData={flowData} 
              flowName={selectedFlow}
            />
          ) : (
            <div className="no-flow-selected">
              <p>Please select a flow to view from the dropdown above.</p>
            </div>
          )}
        </div>

        <div className="comment-container">
          {flowData && (
            <CommentSection 
              flowName={selectedFlow}
              availableNodes={availableNodes}
              onCommentUpdate={handleCommentUpdate}
            />
          )}
        </div>
      </div>
    </div>
  );
} 