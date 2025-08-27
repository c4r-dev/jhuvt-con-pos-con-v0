/**
 * CustomNode Component
 * 
 * Features:
 * - Configurable node with various interactive elements
 * - Supports labels, text boxes, toggles, dropdowns, and input fields
 * - Customizable styling and connections (handles)
 * - State management for interactive elements
 */

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Handle, Position } from '@xyflow/react';

const CustomNode = ({ id, data, selected, isConnectable, updateNode }) => {
  // Local state for input field values
  const [inputValues, setInputValues] = useState({});
  
  // Initialize local input values from data when the component mounts or data changes
  useEffect(() => {
    if (data?.elements?.inputFields) {
      const initialValues = {};
      data.elements.inputFields.forEach((field, index) => {
        initialValues[index] = field.value || '';
      });
      setInputValues(initialValues);
    }
  }, [data?.elements?.inputFields]);

  // Create a unique key based on handle configuration to force re-renders when handles change
  const handleConfigKey = useMemo(() => {
    return `${data.hasInputHandle}-${data.hasTopInputHandle}-${data.hasBottomInputHandle}-${data.hasDoubleTopInputHandle}-${data.hasDoubleBottomInputHandle}-${data.hasOutputHandle}-${data.hasTopOutputHandle}-${data.hasBottomOutputHandle}-${data.hasDoubleBottomOutputHandle}`;
  }, [
    data.hasInputHandle,
    data.hasTopInputHandle, 
    data.hasBottomInputHandle,
    data.hasDoubleTopInputHandle,
    data.hasDoubleBottomInputHandle,
    data.hasOutputHandle,
    data.hasTopOutputHandle,
    data.hasBottomOutputHandle,
    data.hasDoubleBottomOutputHandle
  ]);

  // Determine node state class
  const getNodeStateClass = () => {
    if (data.state === 'active') return 'active';
    if (data.state === 'double-active') return 'double-active';
    if (data.important) return 'important';
    return '';
  };

  // Create node style based on data
  const nodeStyle = {
    backgroundColor: data.bgColor || '#ffffff',
    color: data.textColor || '#000000',
    border: selected ? '2px solid #007bff' : '1px solid #ccc',
    borderRadius: '5px',
    padding: '10px',
    minWidth: '150px',
    maxWidth: '300px',
    position: 'relative'
  };

  // Event handlers
  const handleToggleChange = (e, index) => {
    e.stopPropagation();
    if (updateNode) {
      const newToggles = [...data.elements.toggles];
      newToggles[index] = { ...newToggles[index], value: e.target.checked };
      updateNode(id, {
        ...data,
        elements: { ...data.elements, toggles: newToggles }
      });
    }
  };

  const handleDropdownChange = (e, index) => {
    e.stopPropagation();
    if (updateNode) {
      const newDropdowns = [...data.elements.dropdowns];
      newDropdowns[index] = { ...newDropdowns[index], value: e.target.value };
      updateNode(id, {
        ...data,
        elements: { ...data.elements, dropdowns: newDropdowns }
      });
    }
  };

  const handleInputChange = (e, index) => {
    const newValue = e.target.value;
    setInputValues(prev => ({ ...prev, [index]: newValue }));
  };

  const handleInputBlur = (e, index) => {
    e.stopPropagation();
    if (updateNode) {
      const newInputFields = [...data.elements.inputFields];
      newInputFields[index] = { ...newInputFields[index], value: inputValues[index] || '' };
      updateNode(id, {
        ...data,
        elements: { ...data.elements, inputFields: newInputFields }
      });
    }
  };

  const stopPropagation = (e) => {
    e.stopPropagation();
  };

  // Build ordered elements list based on type and visibility
  const orderedElements = [];
  
  // Add label first if visible
  if (data.elements.label && data.elements.label.visible) {
    orderedElements.push({
      type: 'label',
      content: (
        <div key="label" className="node-header">
          {data.elements.label.text}
        </div>
      )
    });
  }
  
  // Add text boxes
  if (data.elements.textBoxes) {
    data.elements.textBoxes.forEach((textBox, index) => {
      if (textBox.visible) {
        orderedElements.push({
          type: 'textBox',
          content: (
            <div key={`textbox-${index}`} className="node-content">
              {textBox.text.replace(/^- /, '• ')}
            </div>
          )
        });
      }
    });
  }
  
  // Add toggles
  if (data.elements.toggles) {
    data.elements.toggles.forEach((toggle, index) => {
      if (toggle.visible) {
        orderedElements.push({
          type: 'toggle',
          content: (
            <div key={`toggle-${index}`} className="node-toggle" onClick={stopPropagation}>
              <span className="node-toggle-label">{toggle.text}</span>
              <div className="toggle-switch" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={toggle.value}
                  onChange={(e) => handleToggleChange(e, index)}
                  className="interactive-element"
                  onClick={stopPropagation}
                />
                <span className="toggle-slider" onClick={(e) => {
                  e.stopPropagation();
                  handleToggleChange(e, index);
                }}></span>
              </div>
            </div>
          )
        });
      }
    });
  }

  // Add dropdowns
  if (data.elements.dropdowns) {
    data.elements.dropdowns.forEach((dropdown, index) => {
      if (dropdown.visible) {
        orderedElements.push({
          type: 'dropdown',
          content: (
            <div key={`dropdown-${index}`} className="node-dropdown" onClick={stopPropagation}>
              {dropdown.text}
              <select
                value={dropdown.value || ''}
                onChange={(e) => handleDropdownChange(e, index)}
                className="interactive-element"
                onClick={stopPropagation}
              >
                <option value="">Select...</option>
                {dropdown.options && dropdown.options.map((option, optIndex) => (
                  <option key={optIndex} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          )
        });
      }
    });
  }

  // Add input fields
  if (data.elements.inputFields) {
    data.elements.inputFields.forEach((inputField, index) => {
      if (inputField.visible) {
        orderedElements.push({
          type: 'inputField',
          content: (
            <div key={`input-${index}`} className="node-input" onClick={stopPropagation}>
              <input
                type="text"
                placeholder={inputField.placeholder || inputField.text}
                value={inputValues[index] || ''}
                onChange={(e) => handleInputChange(e, index)}
                onBlur={(e) => handleInputBlur(e, index)}
                className="interactive-element"
                onClick={stopPropagation}
              />
            </div>
          )
        });
      }
    });
  }

  return (
    <div
      key={handleConfigKey}
      className={`custom-node ${getNodeStateClass()}`}
      style={nodeStyle}
    >
      {/* Input Handles */}
      {data.hasInputHandle && (
        <Handle
          type="target"
          position={Position.Left}
          id="input-left"
          isConnectable={isConnectable}
        />
      )}
      
      {data.hasTopInputHandle && (
        <Handle
          type="target"
          position={Position.Top}
          id="input-top"
          isConnectable={isConnectable}
          style={{ left: '50%' }}
        />
      )}

      {data.hasDoubleTopInputHandle && (
        <>
          <Handle
            type="target"
            position={Position.Top}
            id="input-top-left"
            isConnectable={isConnectable}
            style={{ left: '25%' }}
          />
          <Handle
            type="target"
            position={Position.Top}
            id="input-top-right"
            isConnectable={isConnectable}
            style={{ left: '75%' }}
          />
        </>
      )}
      
      {data.hasBottomInputHandle && (
        <Handle
          type="target"
          position={Position.Bottom}
          id="input-bottom"
          isConnectable={isConnectable}
          style={{ left: '50%' }}
        />
      )}

      {data.hasDoubleBottomInputHandle && (
        <>
          <Handle
            type="target"
            position={Position.Bottom}
            id="input-bottom-left"
            isConnectable={isConnectable}
            style={{ left: '25%' }}
          />
          <Handle
            type="target"
            position={Position.Bottom}
            id="input-bottom-right"
            isConnectable={isConnectable}
            style={{ left: '75%' }}
          />
        </>
      )}

      {/* Node Content */}
      <div className="node-elements">
        {orderedElements.map((element, index) => element.content)}
      </div>

      {/* Output Handles */}
      {data.hasOutputHandle && (
        <Handle
          type="source"
          position={Position.Right}
          id="output-right"
          isConnectable={isConnectable}
        />
      )}
      
      {data.hasTopOutputHandle && (
        <Handle
          type="source"
          position={Position.Top}
          id="output-top"
          isConnectable={isConnectable}
          style={{ left: '50%' }}
        />
      )}
      
      {data.hasBottomOutputHandle && (
        <Handle
          type="source"
          position={Position.Bottom}
          id="output-bottom"
          isConnectable={isConnectable}
          style={{ left: '50%' }}
        />
      )}

      {data.hasDoubleBottomOutputHandle && (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="output-bottom-left"
            isConnectable={isConnectable}
            style={{ left: '25%' }}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="output-bottom-right"
            isConnectable={isConnectable}
            style={{ left: '75%' }}
          />
        </>
      )}
    </div>
  );
};

export default CustomNode;