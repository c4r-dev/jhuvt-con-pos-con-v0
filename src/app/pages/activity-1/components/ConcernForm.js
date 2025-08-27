/**
 * ConcernForm Component
 * 
 * Features:
 * - Add concerns related to specific nodes
 * - Categorize concerns by type
 * - Store concerns in MongoDB database
 * - Bidirectional node selection with ReactFlow
 */

import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import Select from 'react-select';
import { saveCommentToDatabase } from '../../flow-viewer/utils/commentUtils';

const ConcernForm = forwardRef(({ flowName, sessionId, availableNodes, onConcernUpdate, onNodeSelectionChange }, ref) => {
  const [concernText, setConcernText] = useState('');
  const [concernType, setConcernType] = useState('');
  const [selectedNodes, setSelectedNodes] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Concern type options
  const concernTypeOptions = [
    { value: 'confound', label: 'CONFOUND' },
    { value: 'bias', label: 'BIAS' },
    { value: 'not_sure', label: 'NOT SURE' },
    // { value: 'other', label: 'OTHER' }
  ];

  // Convert availableNodes to format expected by react-select
  const nodeOptions = availableNodes.map(node => ({
    value: node.id,
    label: node.label || `Node ${node.id}`
  }));

  // Update selected node IDs whenever the selection changes
  useEffect(() => {
    if (onNodeSelectionChange) {
      const selectedNodeIds = selectedNodes.map(node => node.value);
      onNodeSelectionChange(selectedNodeIds);
    }
  }, [selectedNodes, onNodeSelectionChange]);

  // Handle node selection from ReactFlow
  const handleNodeSelect = useCallback((nodeId, nodeLabel) => {
    setSelectedNodes(prevSelectedNodes => {
      // Check if node is already selected
      const isNodeSelected = prevSelectedNodes.some(node => node.value === nodeId);
      
      if (isNodeSelected) {
        // Remove node if already selected
        return prevSelectedNodes.filter(node => node.value !== nodeId);
      } else {
        // Add node if not already selected
        return [...prevSelectedNodes, { value: nodeId, label: nodeLabel }];
      }
    });
  }, []);

  // Expose handleNodeSelect method to parent component
  useImperativeHandle(ref, () => ({
    handleNodeSelect
  }), [handleNodeSelect]);

  // Handle concern submission
  const handleSubmitConcern = async (e) => {
    e.preventDefault();
    
    if (!concernText.trim() || selectedNodes.length === 0 || !sessionId) {
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    // Create new concern data (using the same format as comments)
    const concernData = {
      flowId: flowName,
      sessionId: sessionId,
      text: concernText.trim(),
      commentType: 'other', // Default type since dropdown was removed
      nodeIds: selectedNodes.map(node => node.value),
      nodeLabels: selectedNodes.map(node => node.label),
    };
    
    try {
      const result = await saveCommentToDatabase(concernData);
      
      if (result.success) {
        // Reset form
        setConcernText('');
        setSelectedNodes([]);
        
        // Notify parent that concerns have been updated
        if (onConcernUpdate) {
          onConcernUpdate();
        }
      } else {
        setError('Failed to save concern: ' + result.error);
      }
    } catch (error) {
      console.error('Error submitting concern:', error);
      setError('An unexpected error occurred while saving the concern');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="concern-form">
      {/* Error message */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      <div className="instruction-text">
        Consider the study design on the right and try to think of concerns that could potentially jeopardize its validity. Use the interface below to add all concerns you can identify.
      </div>
      
      <div className="form-header">
        <h2>Add a Concern</h2>
      </div>
      
      {/* Concern Form */}
      <form onSubmit={handleSubmitConcern}>
        <div className="form-row">
          <div className="form-group concern-text-group">
            <input
              type="text"
              className="form-control"
              value={concernText}
              onChange={(e) => setConcernText(e.target.value)}
              placeholder="Write a concern..."
              disabled={isSubmitting}
              required
            />
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group node-select-group">
            <Select
              isMulti
              name="nodes"
              options={nodeOptions}
              className="basic-multi-select"
              classNamePrefix="select"
              value={selectedNodes}
              onChange={setSelectedNodes}
              placeholder="Select nodes affected by this concern (or click nodes in the diagram)..."
              isDisabled={isSubmitting || nodeOptions.length === 0}
            />
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group concern-submit-group">
            <button
              type="submit"
              className="button button-primary"
              disabled={isSubmitting || !concernText.trim() || selectedNodes.length === 0}
            >
              ADD TO DIAGRAM
            </button>
          </div>
        </div>
      </form>
    </div>
  );
});

// Add display name for debugging
ConcernForm.displayName = 'ConcernForm';

export default ConcernForm; 