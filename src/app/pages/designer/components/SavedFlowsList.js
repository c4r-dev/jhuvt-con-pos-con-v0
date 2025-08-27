/**
 * SavedFlowsList Component
 * 
 * Features:
 * - Display list of all saved flows from MongoDB
 * - Display flow names, descriptions, and creation dates
 * - Load flows when selected
 */

import React from 'react';

const SavedFlowsList = ({ onLoadFlow, dbFlows, isLoading }) => {

  const handleLoadFlow = (event) => {
    const flowId = event.target.value;
    if (!flowId) return; // Ignore the default option

    const selectedFlow = dbFlows.find(flow => flow.id === flowId);
    
    if (selectedFlow && selectedFlow.flowData && onLoadFlow) {
      onLoadFlow(selectedFlow.flowData);
    }
  };

  return (
    <div className="saved-flows-dropdown-container">
      {isLoading ? (
        <p className="loading">Loading saved flows...</p>
      ) : dbFlows.length === 0 ? (
        <p className="no-flows">No saved flows found</p>
      ) : (
        <select 
          className="form-control saved-flow-select"
          onChange={handleLoadFlow} 
          defaultValue=""
        >
          <option value="" disabled>Select a flow to load...</option>
          {dbFlows.map((flow) => (
            <option key={flow.id} value={flow.id}>
              {flow.name} ({new Date(flow.timestamp).toLocaleDateString()})
            </option>
          ))}
        </select>
      )}
    </div>
  );
};

export default SavedFlowsList; 