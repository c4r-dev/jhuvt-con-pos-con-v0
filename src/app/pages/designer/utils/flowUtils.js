/**
 * Utilities for saving and loading flow data
 */

// DATABASE INTEGRATION FUNCTIONS

// Save flowchart to MongoDB
export const saveFlowToDatabase = async (flowName, flowDescription, nodes, edges) => {
  try {
    const flowchart = JSON.stringify({ nodes, edges });
    const response = await fetch('/api/customFlowchartAPI', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        flowchart,
        name: flowName,
        description: flowDescription || "",
        submissionInstance: 1,
        version: 1,
        createdDate: new Date()
      }),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error('Error saving flow to database:', error);
    return { success: false, error: error.message };
  }
};

// Get all flowcharts from MongoDB
export const getFlowsFromDatabase = async () => {
  try {
    const response = await fetch('/api/customFlowchartAPI');
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    const flowcharts = await response.json();
    
    // Format the data to match the structure used by the app
    return flowcharts.map(flow => {
      const flowData = JSON.parse(flow.flowchart);
      return {
        id: flow._id,
        key: flow._id,
        name: flow.name || `Flow ${flow._id.substring(0, 6)}`,
        description: flow.description || "",
        timestamp: new Date(flow.createdAt || flow.createdDate).getTime(),
        nodeCount: flowData.nodes ? flowData.nodes.length : 0,
        edgeCount: flowData.edges ? flowData.edges.length : 0,
        flowData: flowData,
        version: flow.version
      };
    });
  } catch (error) {
    console.error('Error fetching flows from database:', error);
    return [];
  }
};

// Export flow data to a JSON file
export const exportFlowToJson = (nodes, edges, filename = 'flow-export', addTimestamp = true) => {
  try {
    const flowData = {
      nodes,
      edges,
      timestamp: Date.now(),
    };
    
    // Sanitize the filename to remove any characters that might cause issues
    let sanitizedFilename = filename.replace(/[^a-z0-9\-_]/gi, '_').trim();
    
    // Add a timestamp to the filename if requested
    if (addTimestamp) {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
      sanitizedFilename = `${sanitizedFilename}_${dateStr}`;
    }
    
    // Ensure the filename is not empty
    if (!sanitizedFilename) {
      sanitizedFilename = 'flow-export';
    }
    
    const blob = new Blob([JSON.stringify(flowData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${sanitizedFilename}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error('Error exporting flow:', error);
    return false;
  }
};

// Import flow data from a JSON file
export const importFlowFromJson = (file) => {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const flowData = JSON.parse(event.target.result);
          if (flowData && flowData.nodes && flowData.edges) {
            resolve(flowData);
          } else {
            reject(new Error('Invalid flow data format'));
          }
        } catch (parseError) {
          reject(parseError);
        }
      };
      
      reader.onerror = (error) => {
        reject(error);
      };
      
      reader.readAsText(file);
    } catch (error) {
      reject(error);
    }
  });
}; 