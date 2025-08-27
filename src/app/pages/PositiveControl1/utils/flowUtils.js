export const getFlowsFromDatabase = async () => {
  try {
    // Fetch the local JSON file from the public directory
    const response = await fetch('/flowcharts.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const flowcharts = await response.json();
    
    // Format the data to match the structure used by the app
    const formattedFlows = flowcharts.map(flow => {
      return {
        id: flow.id,
        key: flow.id,
        name: flow.name || `Flow ${flow.id.substring(0, 6)}`,
        description: flow.description || "",
        timestamp: new Date(flow.createdAt).getTime(),
        nodeCount: flow.flowData.nodes ? flow.flowData.nodes.length : 0,
        edgeCount: flow.flowData.edges ? flow.flowData.edges.length : 0,
        flowData: flow.flowData,
        version: flow.version
      };
    });
    return formattedFlows;
  } catch (error) {
    console.error('Error loading flows from JSON:', error);
    return [];
  }
};