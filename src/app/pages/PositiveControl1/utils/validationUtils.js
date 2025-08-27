export const saveNodeValidation = async (flowId, nodeId, validationText) => {
  try {
    const response = await fetch(`/api/flows/${flowId}/nodes/${nodeId}/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ validationText }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to save validation');
    }

    return result; // Should be { success: true, message: ..., data: ... }
  } catch (error) {
    console.error('Error saving node validation:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}; 

export const saveMultiNodeValidation = async (flowId, nodeIds, validationText, nodeLabels) => {
  try {
    const response = await fetch(`/api/flows/${flowId}/validations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        nodeIds, 
        validationText, 
        nodeLabels 
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to save validation');
    }

    return result;
  } catch (error) {
    console.error('Error saving multi-node validation:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
};

export const loadValidationsForFlow = async (flowId) => {
  try {
    const response = await fetch(`/api/flows/${flowId}/validations`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to load validations');
    }

    return result; // Should be { success: true, data: [...] }
  } catch (error) {
    console.error('Error loading validations:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.', data: [] };
  }
};

export const submitPositiveControlWork = async (submissionData) => {
  try {
    const response = await fetch('/api/positive-control-submissions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(submissionData),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to submit positive control work');
    }

    return result;
  } catch (error) {
    console.error('Error submitting positive control work:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
};

// New session flow functions
export const saveSessionFlow = async (sessionId, originalFlowId, originalFlowName, modifiedFlowData, validations) => {
  try {
    const response = await fetch('/api/session-flows', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        originalFlowId,
        originalFlowName,
        modifiedFlowData,
        validations
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to save session flow');
    }

    return result;
  } catch (error) {
    console.error('Error saving session flow:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
};

export const loadSessionFlow = async (sessionId) => {
  try {
    const response = await fetch(`/api/session-flows/${sessionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to load session flow');
    }

    return result; // Should be { success: true, data: {...} }
  } catch (error) {
    console.error('Error loading session flow:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.', data: null };
  }
}; 