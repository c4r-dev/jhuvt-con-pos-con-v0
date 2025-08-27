/**
 * FlowViewer Component
 * 
 * Features:
 * - Renders ReactFlow with saved flow data
 * - Manages node state for interactive elements
 * - Displays comment markers on annotated nodes
 * - Loads comments from MongoDB database
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import CustomNode from '../../designer/components/CustomNode';
import CommentMarker from './CommentMarker';
import { getCommentsForFlow } from '../utils/commentUtils';

const FlowViewer = ({ flowData, flowName }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [nodeComments, setNodeComments] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const nodesInitialized = useRef(false);
  const flowInitialized = useRef(false);

  // Reset state when flow changes
  useEffect(() => {
    setNodes([]);
    setEdges([]);
    setNodeComments({});
    nodesInitialized.current = false;
    flowInitialized.current = false;
  }, [flowName, setNodes, setEdges]);

  // Initialize flow from saved data
  useEffect(() => {
    if (flowData && flowData.nodes && flowData.edges && !flowInitialized.current) {
      // Process nodes to add updateNode function
      const processedNodes = flowData.nodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          // Ensure interactive elements have proper event handling
          interactiveMode: true,
        }
      }));
      
      setNodes(processedNodes);
      setEdges(flowData.edges);
      nodesInitialized.current = true;
      flowInitialized.current = true;
      
      // Load any saved comments for this flow
      loadCommentsFromDatabase(flowName);
    }
    
    // Clean up function
    return () => {
      nodesInitialized.current = false;
      flowInitialized.current = false;
    };
  }, [flowData, flowName, setNodes, setEdges]);

  // Load comments from database
  const loadCommentsFromDatabase = async (flowId) => {
    if (!flowId) return;
    
    setIsLoading(true);
    try {
      const result = await getCommentsForFlow(flowId);
      
      if (result.success && result.data) {
        // Count comments per node
        const nodeCommentCounts = {};
        
        result.data.forEach(comment => {
          if (comment.nodeIds && comment.nodeIds.length > 0) {
            comment.nodeIds.forEach(nodeId => {
              nodeCommentCounts[nodeId] = (nodeCommentCounts[nodeId] || 0) + 1;
            });
          }
        });
        
        setNodeComments(nodeCommentCounts);
      }
    } catch (error) {
      console.error('Error loading comments for flow:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update node data when interacting with toggles, dropdowns, etc.
  const updateNodeData = useCallback((nodeId, newData) => {
    setNodes(nds =>
      nds.map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: { ...newData },
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  // Prevent node selection to avoid UI confusion
  const onNodeClick = useCallback((e, node) => {
    // We want to prevent selection of nodes, but allow interaction with controls
    e.stopPropagation();
    return false;
  }, []);

  // Custom node types with updateNode function passed
  const nodeTypes = {
    customNode: props => <CustomNode {...props} updateNode={updateNodeData} />
  };

  // Create comment markers for nodes that have comments
  const nodeDecorators = nodes.map(node => {
    const commentCount = nodeComments[node.id];
    
    if (commentCount && commentCount > 0) {
      return (
        <CommentMarker 
          key={`marker-${node.id}`}
          nodeId={node.id}
          count={commentCount}
          position={node.position}
        />
      );
    }
    return null;
  }).filter(Boolean);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnScroll={true}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Controls />
        <MiniMap />
        <Background variant="dots" gap={12} size={1} />
        
        {/* Render comment markers */}
        {nodeDecorators}
      </ReactFlow>
    </div>
  );
};

export default FlowViewer; 