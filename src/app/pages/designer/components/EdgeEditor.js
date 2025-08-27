/**
 * EdgeEditor Component
 * 
 * Features:
 * - Edit individual edge properties (type, markers, style)
 * - Bulk operations to apply settings to all edges
 * - Support for all ReactFlow edge types and marker types
 */

import React, { useState, useEffect } from 'react';
import { MarkerType } from '@xyflow/react';

const EdgeEditor = ({ 
  edge, 
  edges, 
  updateEdgeData, 
  bulkUpdateEdges, 
  isEditing, 
  setIsEditing, 
  onClose 
}) => {
  const [formData, setFormData] = useState({
    type: 'default',
    animated: false,
    style: {
      stroke: '#b1b1b7',
      strokeWidth: 1,
    },
    markerStart: 'none',
    markerEnd: 'none',
    label: '',
  });

  // Edge types available in ReactFlow
  const edgeTypes = [
    { value: 'default', label: 'Default (Bezier)' },
    { value: 'straight', label: 'Straight' },
    { value: 'step', label: 'Step' },
    { value: 'smoothstep', label: 'Smooth Step' },
  ];

  // Marker types available in ReactFlow
  const markerTypes = [
    { value: 'none', label: 'None' },
    { value: MarkerType.Arrow, label: 'Arrow' },
    { value: MarkerType.ArrowClosed, label: 'Arrow Closed' },
  ];

  // Update form when selected edge changes
  useEffect(() => {
    if (edge && isEditing) {
      setFormData({
        type: edge.type || 'default',
        animated: edge.animated || false,
        style: edge.style || { stroke: '#b1b1b7', strokeWidth: 1 },
        markerStart: edge.markerStart?.type || 'none',
        markerEnd: edge.markerEnd?.type || 'none',
        label: edge.label || '',
      });
    }
  }, [edge, isEditing]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleStyleChange = (property, value) => {
    setFormData(prev => ({
      ...prev,
      style: {
        ...prev.style,
        [property]: value
      }
    }));
  };

  const applyChanges = () => {
    if (!edge || !updateEdgeData) return;

    const updatedEdge = {
      ...edge,
      type: formData.type,
      animated: formData.animated,
      style: formData.style,
      label: formData.label || undefined,
      markerStart: formData.markerStart !== 'none' ? { type: formData.markerStart } : undefined,
      markerEnd: formData.markerEnd !== 'none' ? { type: formData.markerEnd } : undefined,
    };

    updateEdgeData(edge.id, updatedEdge);
    setIsEditing(false);
  };

  const applyToAllEdges = () => {
    if (!bulkUpdateEdges) return;

    const bulkUpdates = {
      type: formData.type,
      animated: formData.animated,
      style: formData.style,
      markerStart: formData.markerStart !== 'none' ? { type: formData.markerStart } : undefined,
      markerEnd: formData.markerEnd !== 'none' ? { type: formData.markerEnd } : undefined,
      // Note: We don't apply labels to all edges as each edge should have its own label
    };

    bulkUpdateEdges(bulkUpdates);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    if (onClose) onClose();
  };

  return (
    <div className="edge-editor-form">
      {/* Individual Edge Editing */}
      {isEditing && edge && (
        <div className="form-section">
          <h3>Edit Edge</h3>
          <p>Editing edge from {edge.source} to {edge.target}</p>
          
          <div className="form-group">
            <label>Edge Type:</label>
            <select
              className="form-control"
              name="type"
              value={formData.type}
              onChange={handleInputChange}
            >
              {edgeTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="checkbox-container">
            <input
              type="checkbox"
              id="animated"
              name="animated"
              checked={formData.animated}
              onChange={handleInputChange}
            />
            <label htmlFor="animated">Animated</label>
          </div>

          <div className="form-group">
            <label>Start Marker:</label>
            <select
              className="form-control"
              name="markerStart"
              value={formData.markerStart}
              onChange={handleInputChange}
            >
              {markerTypes.map(marker => (
                <option key={marker.value} value={marker.value}>
                  {marker.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>End Marker:</label>
            <select
              className="form-control"
              name="markerEnd"
              value={formData.markerEnd}
              onChange={handleInputChange}
            >
              {markerTypes.map(marker => (
                <option key={marker.value} value={marker.value}>
                  {marker.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Label (optional):</label>
            <input
              type="text"
              className="form-control"
              name="label"
              value={formData.label}
              onChange={handleInputChange}
              placeholder="Edge label"
            />
          </div>

          <div className="form-group">
            <label>Stroke Color:</label>
            <input
              type="color"
              className="color-picker"
              value={formData.style.stroke}
              onChange={(e) => handleStyleChange('stroke', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Stroke Width:</label>
            <input
              type="number"
              className="form-control"
              value={formData.style.strokeWidth}
              onChange={(e) => handleStyleChange('strokeWidth', parseInt(e.target.value))}
              min="1"
              max="10"
            />
          </div>

          <div className="edge-editor-buttons">
            <button 
              type="button" 
              className="button button-primary"
              onClick={applyChanges}
            >
              Apply Changes
            </button>
            <button 
              type="button" 
              className="button button-secondary"
              onClick={applyToAllEdges}
            >
              Apply to All Edges ({edges.length})
            </button>
            <button 
              type="button" 
              className="button button-secondary"
              onClick={cancelEditing}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Information when no edge is selected */}
      {!isEditing && (
        <div className="form-section">
          <h3>Edge Editing</h3>
          <p>Click on any edge in the diagram to edit its properties, including type, markers, colors, and animation.</p>
          
          <div style={{ 
            backgroundColor: '#e7f3ff', 
            padding: '12px', 
            borderRadius: '4px', 
            marginBottom: '16px',
            border: '1px solid #b3d9ff'
          }}>
            <strong>Available Edge Types:</strong>
            <ul style={{ marginTop: '8px', marginBottom: '0', paddingLeft: '20px' }}>
              <li>Default (Bezier) - Smooth curved edges</li>
              <li>Straight - Direct straight lines</li>
              <li>Step - Right-angled connections</li>
              <li>Smooth Step - Rounded right-angled connections</li>
            </ul>
          </div>

          <div style={{ 
            backgroundColor: '#fff3cd', 
            padding: '12px', 
            borderRadius: '4px', 
            marginBottom: '16px',
            border: '1px solid #ffeaa7'
          }}>
            <strong>💡 Tip:</strong> After configuring an edge&apos;s properties, you can use the &quot;Apply to All Edges&quot; button to apply those same settings (type, markers, styling) to all edges in the diagram at once.
          </div>
        </div>
      )}
    </div>
  );
};

export default EdgeEditor; 