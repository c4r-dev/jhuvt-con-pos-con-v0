/**
 * FlowToolbar Component
 * 
 * Features:
 * - Save flows to MongoDB database
 * - Export/import flows as JSON
 * - Toggle between build and use modes
 * - AI-powered flowchart transformation
 */

import React, { useState, useRef } from 'react';
import { exportFlowToJson, importFlowFromJson } from '../utils/flowUtils';

const FlowToolbar = ({ nodes, edges, setNodes, setEdges, onSave, onLoad, setIsTransforming, dbFlows = [] }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [flowName, setFlowName] = useState('');
  const [flowDescription, setFlowDescription] = useState('');
  const [isShowingTransformForm, setIsShowingTransformForm] = useState(false);
  const [transformInstructions, setTransformInstructions] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Get the current flow name (if saved)
  const getCurrentFlowName = () => {
    // If user is currently entering a name in the save form, use that
    if (isSaving && flowName) {
      return flowName;
    }
    
    // Try to find a matching flow in saved flows by comparing nodes
    if (dbFlows && dbFlows.length > 0 && nodes) {
      // Simple heuristic: check if node count and IDs match between current nodes and a saved flow
      const nodeIds = nodes.map(node => node.id).sort().join(',');
      
      const matchingFlow = dbFlows.find(flow => {
        if (!flow.flowData || !flow.flowData.nodes) return false;
        const savedNodeIds = flow.flowData.nodes.map(node => node.id).sort().join(',');
        return savedNodeIds === nodeIds;
      });
      
      if (matchingFlow) {
        return matchingFlow.name;
      }
    }
    
    return 'flow-export';
  };

  const handleExport = () => {
    const exportName = getCurrentFlowName();
    const success = exportFlowToJson(nodes, edges, exportName);
    
    if (success) {
      // Show a small toast notification
      const notification = document.createElement('div');
      notification.className = 'export-notification';
      notification.textContent = `Exported "${exportName}.json" successfully`;
      document.body.appendChild(notification);
      
      // Remove the notification after 3 seconds
      setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
          document.body.removeChild(notification);
        }, 500);
      }, 3000);
    }
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    importFlowFromJson(file)
      .then((flowData) => {
        if (onLoad) {
          onLoad(flowData);
        } else {
          setNodes(flowData.nodes || []);
          setEdges(flowData.edges || []);
        }
      })
      .catch((error) => {
        console.error('Error importing flow:', error);
        alert('Failed to import flow. Please check the file format.');
      });
    
    // Reset the file input
    e.target.value = null;
  };

  const handleSaveClick = () => {
    setIsSaving(true);
  };

  const handleSaveSubmit = (e) => {
    e.preventDefault();
    
    if (onSave) {
      onSave(flowName, flowDescription, nodes, edges);
    }
    
    setIsSaving(false);
    setFlowName('');
    setFlowDescription('');
  };

  const handleCancelSave = () => {
    setIsSaving(false);
    setFlowName('');
    setFlowDescription('');
  };

  const handleTransformClick = () => {
    setIsShowingTransformForm(true);
  };

  const handleTransformSubmit = async (e) => {
    e.preventDefault();
    
    if (!transformInstructions.trim()) {
      alert('Please enter instructions for how to transform your flowchart.');
      return;
    }
    
    setIsLoading(true);
    if (setIsTransforming) {
      setIsTransforming(true);
    }
    
    try {
      const flowData = { nodes, edges };
      
      const response = await fetch('/api/flowTransformAPI', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          flowData,
          userInstruction: transformInstructions,
        }),
      });
      
      // Parse the response JSON only once
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(
          responseData?.error || responseData?.details || `Server responded with status ${response.status}`
        );
      }
      
      // Use the already parsed response data
      const transformedFlow = responseData;
      
      // Validate the transformed flow data
      if (!transformedFlow || !transformedFlow.nodes || !Array.isArray(transformedFlow.nodes)) {
        throw new Error('Invalid flowchart data received from AI transformation');
      }
      
      // Check if any critical IDs are missing in the transformed nodes
      const missingIds = nodes.some(node => 
        !transformedFlow.nodes.find(newNode => newNode.id === node.id)
      );
      
      if (missingIds) {
        const confirmReplace = window.confirm(
          'Warning: The AI transformation appears to have removed some existing nodes. Would you like to proceed with the changes?'
        );
        
        if (!confirmReplace) {
          throw new Error('Transformation cancelled by user due to node removals');
        }
      }
      
      // Load the transformed flow
      if (onLoad) {
        onLoad(transformedFlow);
      } else {
        setNodes(transformedFlow.nodes || []);
        setEdges(transformedFlow.edges || []);
      }
      
      setIsShowingTransformForm(false);
      setTransformInstructions('');
      
    } catch (error) {
      console.error('Error transforming flowchart:', error);
      alert(`Failed to transform flowchart: ${error.message}`);
    } finally {
      setIsLoading(false);
      if (setIsTransforming) {
        setIsTransforming(false);
      }
    }
  };

  const handleCancelTransform = () => {
    setIsShowingTransformForm(false);
    setTransformInstructions('');
  };

  return (
    <div className="flow-toolbar">
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Transforming your flowchart with AI...</p>
        </div>
      )}
      
      {!isSaving && !isShowingTransformForm ? (
        <div className="toolbar-actions">
          <button
            className="button button-primary"
            onClick={handleSaveClick}
          >
            Save
          </button>
          <button
            className="button button-secondary"
            onClick={handleExport}
          >
            Export
          </button>
          <button
            className="button button-secondary"
            onClick={() => fileInputRef.current.click()}
          >
            Import
          </button>
          <button
            className="button button-primary ai-transform-button"
            onClick={handleTransformClick}
          >
            AI Transform
          </button>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".json"
            onChange={handleImport}
          />
        </div>
      ) : isSaving ? (
        <form onSubmit={handleSaveSubmit} className="save-form">
          <div className="form-group">
            <input
              type="text"
              className="form-control"
              placeholder="Flow name"
              value={flowName}
              onChange={(e) => setFlowName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <textarea
              className="form-control"
              placeholder="Flow description (optional)"
              value={flowDescription}
              onChange={(e) => setFlowDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="save-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={handleCancelSave}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="button button-primary"
            >
              Save
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleTransformSubmit} className="transform-form">
          <div className="form-group">
            <textarea
              className="form-control"
              placeholder="Describe how you want to transform your flowchart..."
              value={transformInstructions}
              onChange={(e) => setTransformInstructions(e.target.value)}
              rows={3}
              required
            />
          </div>
          <div className="transform-instructions">
            <p>Examples: &quot;Add a new node for data validation&quot;, &quot;Change all red nodes to blue&quot;, &quot;Connect node A to node B&quot;</p>
          </div>
          <div className="transform-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={handleCancelTransform}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="button button-primary"
            >
              Transform
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default FlowToolbar; 