import React from 'react';

const CommentMarker = ({ nodeId, count, position }) => {
  return (
    <div
      className="comment-marker"
      style={{
        transform: `translate(${position.x + 100}px, ${position.y - 10}px)`,
      }}
      title={`This node has ${count} comment${count !== 1 ? 's' : ''}`}
    >
      {count}
    </div>
  );
};

export default CommentMarker; 