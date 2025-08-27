/**
 * CommentSection Component
 * 
 * Features:
 * - Add, edit, and delete comments on flows
 * - Link comments to specific nodes
 * - Categorize comments by type
 * - Store comments in MongoDB database
 * - Highlight nodes associated with comments
 */

import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { saveCommentToDatabase, getCommentsForFlow, deleteComment } from '../utils/commentUtils';

const CommentSection = ({ flowName, availableNodes, onCommentUpdate }) => {
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentType, setCommentType] = useState('');
  const [selectedNodes, setSelectedNodes] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Comment type options
  const commentTypeOptions = [
    { value: 'question', label: 'Question' },
    { value: 'feedback', label: 'Feedback' },
    { value: 'clarification', label: 'Clarification' },
    { value: 'suggestion', label: 'Suggestion' },
    { value: 'bug', label: 'Bug' },
    { value: 'other', label: 'Other' }
  ];

  // Load comments when flow changes
  useEffect(() => {
    if (flowName) {
      loadCommentsFromDatabase(flowName);
    } else {
      setComments([]);
    }
  }, [flowName]);

  // Load comments from the database
  const loadCommentsFromDatabase = async (flowId) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await getCommentsForFlow(flowId);
      
      if (result.success) {
        setComments(result.data);
      } else {
        setError('Failed to load comments: ' + result.error);
        setComments([]);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
      setError('An unexpected error occurred while loading comments');
      setComments([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle comment submission
  const handleSubmitComment = async (e) => {
    e.preventDefault();
    
    if (!commentText.trim() || selectedNodes.length === 0 || !commentType) {
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    // Create new comment data
    const commentData = {
      flowId: flowName,
      text: commentText.trim(),
      commentType: commentType,
      nodeIds: selectedNodes.map(node => node.value),
      nodeLabels: selectedNodes.map(node => node.label),
    };
    
    try {
      const result = await saveCommentToDatabase(commentData);
      
      if (result.success) {
        // Reload comments from the database to get the newly added comment
        await loadCommentsFromDatabase(flowName);
        
        // Reset form
        setCommentText('');
        setCommentType('');
        setSelectedNodes([]);
        
        // Notify parent that comments have been updated
        if (onCommentUpdate) {
          onCommentUpdate();
        }
      } else {
        setError('Failed to save comment: ' + result.error);
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
      setError('An unexpected error occurred while saving the comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete a comment
  const handleDeleteComment = async (commentId) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await deleteComment(commentId);
      
      if (result.success) {
        // Reload comments to reflect the deletion
        await loadCommentsFromDatabase(flowName);
        
        // Notify parent that comments have been updated
        if (onCommentUpdate) {
          onCommentUpdate();
        }
      } else {
        setError('Failed to delete comment: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      setError('An unexpected error occurred while deleting the comment');
    } finally {
      setIsLoading(false);
    }
  };

  // Format date for display
  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Convert availableNodes to format expected by react-select
  const nodeOptions = availableNodes.map(node => ({
    value: node.id,
    label: node.label || `Node ${node.id}`
  }));

  // Get comment type label for display
  const getCommentTypeLabel = (type) => {
    const option = commentTypeOptions.find(opt => opt.value === type);
    return option ? option.label : type;
  };

  return (
    <div className="comment-section">
      <h2>Node Comments</h2>
      
      {/* Error message */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      {/* Comment Form */}
      <form onSubmit={handleSubmitComment} className="comment-form">
        <div className="form-group">
          <label>Select Nodes:</label>
          <Select
            isMulti
            name="nodes"
            options={nodeOptions}
            className="basic-multi-select"
            classNamePrefix="select"
            value={selectedNodes}
            onChange={setSelectedNodes}
            placeholder="Select nodes to comment on..."
            isDisabled={isSubmitting || nodeOptions.length === 0}
          />
        </div>
        
        <div className="form-group">
          <label>Comment Type:</label>
          <Select
            name="commentType"
            options={commentTypeOptions}
            className="basic-select"
            classNamePrefix="select"
            value={commentTypeOptions.find(option => option.value === commentType)}
            onChange={(selectedOption) => setCommentType(selectedOption.value)}
            placeholder="Select a comment type..."
            isDisabled={isSubmitting}
            required
          />
        </div>
        
        <div className="form-group">
          <label>Your Comment:</label>
          <textarea
            className="form-control"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Enter your comment here..."
            rows={4}
            disabled={isSubmitting}
            required
          />
        </div>
        
        <button
          type="submit"
          className="button button-primary"
          disabled={isSubmitting || !commentText.trim() || !commentType || selectedNodes.length === 0}
        >
          {isSubmitting ? 'Submitting...' : 'Add Comment'}
        </button>
      </form>
      
      {/* Comments List */}
      <div className="comments-list">
        <h3>Comments ({comments.length})</h3>
        
        {isLoading && !comments.length ? (
          <div className="loading-comments">Loading comments...</div>
        ) : comments.length === 0 ? (
          <p className="no-comments">No comments yet. Be the first to add one!</p>
        ) : (
          comments.map(comment => (
            <div key={comment._id} className="comment-item">
              <div className="comment-header">
                <div className="comment-meta">
                  <span className="comment-time">{formatDate(comment.timestamp)}</span>
                  <span className="comment-type" data-type={comment.commentType}>
                    {getCommentTypeLabel(comment.commentType)}
                  </span>
                </div>
                <button
                  className="delete-button"
                  onClick={() => handleDeleteComment(comment._id)}
                  title="Delete comment"
                  disabled={isLoading}
                >
                  &times;
                </button>
              </div>
              
              <div className="comment-text">{comment.text}</div>
              
              <div className="comment-nodes">
                <strong>Nodes:</strong>
                <ul>
                  {comment.nodeLabels.map((label, index) => (
                    <li key={comment.nodeIds[index]}>
                      {label}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CommentSection; 