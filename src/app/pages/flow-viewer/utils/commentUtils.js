/**
 * Utilities for saving and loading flow comments
 */

// Save a comment to the database
export const saveCommentToDatabase = async (comment) => {
  try {
    const response = await fetch('/api/flowCommentAPI', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(comment),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Error: ${response.status}`);
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error('Error saving comment to database:', error);
    return { success: false, error: error.message };
  }
};

// Get all comments for a specific flow and session
export const getCommentsForFlow = async (flowId, sessionId) => {
  try {
    if (!flowId || !sessionId) {
      throw new Error('Both flowId and sessionId are required');
    }

    const response = await fetch(`/api/flowCommentAPI?flowId=${flowId}&sessionId=${sessionId}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Error: ${response.status}`);
    }

    const comments = await response.json();
    return { success: true, data: comments };
  } catch (error) {
    console.error('Error fetching comments from database:', error);
    return { success: false, error: error.message, data: [] };
  }
};

// Delete a comment
export const deleteComment = async (commentId) => {
  try {
    const response = await fetch(`/api/flowCommentAPI?commentId=${commentId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Error: ${response.status}`);
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error('Error deleting comment:', error);
    return { success: false, error: error.message };
  }
}; 