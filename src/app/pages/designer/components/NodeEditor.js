/**
 * NodeEditor Component
 * 
 * Features:
 * - Configure properties of custom nodes
 * - Add/edit/remove node elements (labels, text boxes, toggles, etc.)
 * - Customize node appearance (colors, borders)
 * - Configure node connections (input/output handles)
 * - Duplicate nodes
 */

import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { nanoid } from 'nanoid';

const defaultNodeData = {
  elements: {
    label: {
      visible: true,
      text: 'New Node'
    },
    textBoxes: [],
    toggles: [],
    dropdowns: [],
    inputFields: []
  },
  hasInputHandle: true,
  hasOutputHandle: true,
  hasTopInputHandle: false,
  hasBottomInputHandle: false,
  hasTopOutputHandle: false,
  hasBottomOutputHandle: false,
  hasDoubleTopInputHandle: false,
  hasDoubleBottomInputHandle: false,
  hasDoubleBottomOutputHandle: false,
  bgColor: '#f2f2f2',
  textColor: '#333333',
  state: 'default',
  important: false,
  // Manual sizing properties
  manualSize: false,
  width: 200,
  height: 100
};

const NodeEditor = forwardRef(({ 
  node, 
  updateNodeData, 
  addNewNode, 
  isEditing, 
  setIsEditing, 
  duplicateNode 
}, ref) => {
  const [formData, setFormData] = useState({ ...defaultNodeData });
  const [originalData, setOriginalData] = useState(null);
  const formRef = useRef(null);
  
  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    revertChanges: () => {
      if (isEditing && node && originalData) {
        updateNodeData(node.id, originalData);
        return true;
      }
      return false;
    }
  }));
  
  // Update form when selected node changes
  useEffect(() => {
    if (node && isEditing) {
      // Handle legacy node data format
      if (!node.data.elements) {
        const updatedData = convertLegacyNodeData(node.data);
        setFormData({ ...updatedData });
        setOriginalData({ ...updatedData });
      } else {
        // Handle nodes with new structure but potentially missing manual sizing properties
        const nodeDataWithDefaults = {
          ...node.data,
          manualSize: node.data.manualSize || false,
          width: node.data.width || 200,
          height: node.data.height || 100
        };
        setFormData({ ...nodeDataWithDefaults });
        setOriginalData({ ...nodeDataWithDefaults });
      }
    } else {
      setFormData({ ...defaultNodeData });
      setOriginalData(null);
    }
  }, [node, isEditing]);

  // Live update the node on form data changes
  useEffect(() => {
    if (isEditing && node && formData !== originalData) {
      updateNodeData(node.id, formData);
    }
  }, [formData, isEditing, node, updateNodeData, originalData]);

  // Convert legacy node data format to new structure
  const convertLegacyNodeData = (data) => {
    const elements = {
      label: {
        visible: !!data.label,
        text: data.label || ''
      },
      textBoxes: data.textBox ? [{
        visible: true,
        text: data.textBox
      }] : [],
      toggles: data.toggle ? [{
        visible: true,
        text: data.toggle.text || '',
        value: data.toggle.value || false
      }] : [],
      dropdowns: data.dropdown ? [{
        visible: true,
        label: data.dropdown.label || '',
        options: [...(data.dropdown.options || [])],
        selected: data.dropdown.selected || ''
      }] : [],
      inputFields: data.inputField ? [{
        visible: true,
        placeholder: data.inputField.placeholder || '',
        value: data.inputField.value || ''
      }] : []
    };

    return {
      ...data,
      elements,
      // Add manual sizing properties with defaults for backward compatibility
      manualSize: data.manualSize || false,
      width: data.width || 200,
      height: data.height || 100,
      // Add double handle properties with defaults for backward compatibility
      hasDoubleTopInputHandle: data.hasDoubleTopInputHandle || false,
      hasDoubleBottomInputHandle: data.hasDoubleBottomInputHandle || false,
      hasDoubleBottomOutputHandle: data.hasDoubleBottomOutputHandle || false
    };
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent],
          [child]: type === 'checkbox' ? checked : value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value
      });
    }
  };

  // Handle changes to element properties
  const handleElementChange = (element, index, field, value) => {
    setFormData({
      ...formData,
      elements: {
        ...formData.elements,
        [element]: formData.elements[element].map((item, i) => 
          i === index ? { ...item, [field]: value } : item
        )
      }
    });
  };

  // Handle changes to label
  const handleLabelChange = (field, value) => {
    setFormData({
      ...formData,
      elements: {
        ...formData.elements,
        label: {
          ...formData.elements.label,
          [field]: value
        }
      }
    });
  };

  // Add a new element
  const addElement = (elementType, defaultProps) => {
    setFormData({
      ...formData,
      elements: {
        ...formData.elements,
        [elementType]: [
          ...formData.elements[elementType],
          { visible: true, ...defaultProps }
        ]
      }
    });
  };

  // Remove an element
  const removeElement = (elementType, index) => {
    setFormData({
      ...formData,
      elements: {
        ...formData.elements,
        [elementType]: formData.elements[elementType].filter((_, i) => i !== index)
      }
    });
  };

  // Add dropdown option
  const addDropdownOption = (dropdownIndex, option = '') => {
    const newOptions = [
      ...formData.elements.dropdowns[dropdownIndex].options,
      option || `Option ${formData.elements.dropdowns[dropdownIndex].options.length + 1}`
    ];
    
    handleElementChange('dropdowns', dropdownIndex, 'options', newOptions);
  };

  // Remove dropdown option
  const removeDropdownOption = (dropdownIndex, optionIndex) => {
    const dropdown = formData.elements.dropdowns[dropdownIndex];
    if (dropdown.options.length <= 1) return;
    
    const newOptions = dropdown.options.filter((_, i) => i !== optionIndex);
    
    // Update selected value if the removed option was selected
    let selected = dropdown.selected;
    if (selected === dropdown.options[optionIndex] && newOptions.length > 0) {
      selected = newOptions[0];
      handleElementChange('dropdowns', dropdownIndex, 'selected', selected);
    }
    
    handleElementChange('dropdowns', dropdownIndex, 'options', newOptions);
  };

  // Update dropdown option
  const updateDropdownOption = (dropdownIndex, optionIndex, value) => {
    const newOptions = [...formData.elements.dropdowns[dropdownIndex].options];
    newOptions[optionIndex] = value;
    
    handleElementChange('dropdowns', dropdownIndex, 'options', newOptions);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (isEditing && node) {
      // Node already updated in real-time
      setOriginalData({ ...formData });
      setIsEditing(false);
    } else {
      // Add new node
      addNewNode(formData);
      // Reset form
      setFormData({ ...defaultNodeData });
    }
  };

  const handleCancel = () => {
    if (isEditing && node && originalData) {
      // Revert changes
      updateNodeData(node.id, originalData);
    }
    setIsEditing(false);
    setFormData({ ...defaultNodeData });
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="node-editor-form">
      {/* Sticky Update Button */}
      <div className="sticky-button-container">
        <button type="submit" className="button button-primary">
          {isEditing ? 'Update Node' : 'Add Node'}
        </button>
        {isEditing && (
          <>
            <button type="button" className="button button-secondary" onClick={handleCancel}>
              Cancel
            </button>
            {duplicateNode && (
              <button 
                type="button" 
                className="button button-secondary" 
                onClick={() => duplicateNode(node)}
                title="Create a copy of this node"
              >
                Duplicate
              </button>
            )}
          </>
        )}
      </div>
      
      {/* Node Label */}
      <div className="form-section">
        <div className="section-header">
          <h3>Label</h3>
          <label className="toggle-switch small">
            <input
              type="checkbox"
              checked={formData.elements.label.visible}
              onChange={(e) => handleLabelChange('visible', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
        
        {formData.elements.label.visible && (
          <div className="form-group">
            <input
              type="text"
              className="form-control"
              value={formData.elements.label.text}
              onChange={(e) => handleLabelChange('text', e.target.value)}
              placeholder="Label text"
            />
          </div>
        )}
      </div>
      
      {/* Text Boxes */}
      <div className="form-section">
        <div className="section-header">
          <h3>Text Boxes</h3>
          <button 
            type="button" 
            className="add-button"
            onClick={() => addElement('textBoxes', { text: '' })}
          >
            +
          </button>
        </div>
        
        {formData.elements.textBoxes.map((textBox, index) => (
          <div key={`textbox-${index}`} className="element-container">
            <div className="element-header">
              <label className="toggle-switch small">
                <input
                  type="checkbox"
                  checked={textBox.visible}
                  onChange={(e) => handleElementChange('textBoxes', index, 'visible', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
              <button 
                type="button" 
                className="remove-button"
                onClick={() => removeElement('textBoxes', index)}
              >
                ×
              </button>
            </div>
            
            {textBox.visible && (
              <div className="form-group">
                <textarea
                  className="form-control"
                  value={textBox.text}
                  onChange={(e) => handleElementChange('textBoxes', index, 'text', e.target.value)}
                  placeholder="Text content"
                  rows="2"
                ></textarea>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Toggles */}
      <div className="form-section">
        <div className="section-header">
          <h3>Toggles</h3>
          <button 
            type="button" 
            className="add-button"
            onClick={() => addElement('toggles', { text: 'Toggle', value: false })}
          >
            +
          </button>
        </div>
        
        {formData.elements.toggles.map((toggle, index) => (
          <div key={`toggle-${index}`} className="element-container">
            <div className="element-header">
              <label className="toggle-switch small">
                <input
                  type="checkbox"
                  checked={toggle.visible}
                  onChange={(e) => handleElementChange('toggles', index, 'visible', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
              <button 
                type="button" 
                className="remove-button"
                onClick={() => removeElement('toggles', index)}
              >
                ×
              </button>
            </div>
            
            {toggle.visible && (
              <div className="toggle-editor">
                <div className="form-group">
                  <input
                    type="text"
                    className="form-control"
                    value={toggle.text}
                    onChange={(e) => handleElementChange('toggles', index, 'text', e.target.value)}
                    placeholder="Toggle label"
                  />
                </div>
                
                <div className="checkbox-container" style={{ marginTop: '10px' }}>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={toggle.value}
                      onChange={(e) => handleElementChange('toggles', index, 'value', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                  <span style={{ marginLeft: '10px' }}>Default state</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Dropdowns */}
      <div className="form-section">
        <div className="section-header">
          <h3>Dropdowns</h3>
          <button 
            type="button" 
            className="add-button"
            onClick={() => addElement('dropdowns', { 
              label: 'Select an option:', 
              options: ['Option 1', 'Option 2', 'Option 3'], 
              selected: 'Option 1'
            })}
          >
            +
          </button>
        </div>
        
        {formData.elements.dropdowns.map((dropdown, dropdownIndex) => (
          <div key={`dropdown-${dropdownIndex}`} className="element-container">
            <div className="element-header">
              <label className="toggle-switch small">
                <input
                  type="checkbox"
                  checked={dropdown.visible}
                  onChange={(e) => handleElementChange('dropdowns', dropdownIndex, 'visible', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
              <button 
                type="button" 
                className="remove-button"
                onClick={() => removeElement('dropdowns', dropdownIndex)}
              >
                ×
              </button>
            </div>
            
            {dropdown.visible && (
              <div className="dropdown-editor">
                <div className="form-group">
                  <input
                    type="text"
                    className="form-control"
                    value={dropdown.label}
                    onChange={(e) => handleElementChange('dropdowns', dropdownIndex, 'label', e.target.value)}
                    placeholder="Dropdown label"
                  />
                </div>
                
                <div className="dropdown-options">
                  {dropdown.options.map((option, optionIndex) => (
                    <div key={`option-${dropdownIndex}-${optionIndex}`} className="option-item">
                      <input
                        type="text"
                        className="form-control"
                        value={option}
                        onChange={(e) => updateDropdownOption(dropdownIndex, optionIndex, e.target.value)}
                        placeholder="Option text"
                      />
                      <button 
                        type="button" 
                        onClick={() => removeDropdownOption(dropdownIndex, optionIndex)}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                  
                  <button 
                    type="button" 
                    className="add-option-btn" 
                    onClick={() => addDropdownOption(dropdownIndex)}
                  >
                    + Add Option
                  </button>
                </div>
                
                <div className="form-group">
                  <label>Default selection:</label>
                  <select
                    className="form-control"
                    value={dropdown.selected}
                    onChange={(e) => handleElementChange('dropdowns', dropdownIndex, 'selected', e.target.value)}
                  >
                    {dropdown.options.map((option, optionIndex) => (
                      <option key={`select-${optionIndex}`} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Input Fields */}
      <div className="form-section">
        <div className="section-header">
          <h3>Input Fields</h3>
          <button 
            type="button" 
            className="add-button"
            onClick={() => addElement('inputFields', { placeholder: 'Type here...', value: '' })}
          >
            +
          </button>
        </div>
        
        {formData.elements.inputFields.map((inputField, index) => (
          <div key={`input-${index}`} className="element-container">
            <div className="element-header">
              <label className="toggle-switch small">
                <input
                  type="checkbox"
                  checked={inputField.visible}
                  onChange={(e) => handleElementChange('inputFields', index, 'visible', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
              <button 
                type="button" 
                className="remove-button"
                onClick={() => removeElement('inputFields', index)}
              >
                ×
              </button>
            </div>
            
            {inputField.visible && (
              <div className="form-group">
                <input
                  type="text"
                  className="form-control"
                  value={inputField.placeholder}
                  onChange={(e) => handleElementChange('inputFields', index, 'placeholder', e.target.value)}
                  placeholder="Placeholder text"
                />
                
                <input
                  type="text"
                  className="form-control mt-2"
                  value={inputField.value}
                  onChange={(e) => handleElementChange('inputFields', index, 'value', e.target.value)}
                  placeholder="Default value (optional)"
                />
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Node State */}
      <div className="form-section">
        <h3>Node State</h3>
        
        <div className="form-group">
          <label>Visual State:</label>
          <select
            className="form-control"
            value={formData.state}
            onChange={(e) => handleInputChange({ target: { name: 'state', value: e.target.value } })}
          >
            <option value="default">Default</option>
            <option value="active">Active</option>
            <option value="double-active">Double Active</option>
          </select>
        </div>
        
        <div className="checkbox-container" style={{ marginTop: '10px' }}>
          <input
            type="checkbox"
            id="important"
            checked={formData.important}
            onChange={(e) => handleInputChange({ target: { name: 'important', type: 'checkbox', checked: e.target.checked } })}
          />
          <label htmlFor="important">Mark as Important</label>
        </div>
      </div>
      
      {/* Handle Checkboxes */}
      <div className="form-section">
        <h3>Connection Points</h3>
        
        <div className="checkbox-container">
          <input
            type="checkbox"
            id="hasInputHandle"
            name="hasInputHandle"
            checked={formData.hasInputHandle}
            onChange={handleInputChange}
          />
          <label htmlFor="hasInputHandle">Input Handle (left side)</label>
        </div>

        <div className="checkbox-container">
          <input
            type="checkbox"
            id="hasTopInputHandle"
            name="hasTopInputHandle"
            checked={formData.hasTopInputHandle}
            onChange={handleInputChange}
          />
          <label htmlFor="hasTopInputHandle">Input Handle (top)</label>
        </div>

        <div className="checkbox-container">
          <input
            type="checkbox"
            id="hasBottomInputHandle"
            name="hasBottomInputHandle"
            checked={formData.hasBottomInputHandle}
            onChange={handleInputChange}
          />
          <label htmlFor="hasBottomInputHandle">Input Handle (bottom)</label>
        </div>
        
        <div className="checkbox-container">
          <input
            type="checkbox"
            id="hasOutputHandle"
            name="hasOutputHandle"
            checked={formData.hasOutputHandle}
            onChange={handleInputChange}
          />
          <label htmlFor="hasOutputHandle">Output Handle (right side)</label>
        </div>

        <div className="checkbox-container">
          <input
            type="checkbox"
            id="hasTopOutputHandle"
            name="hasTopOutputHandle"
            checked={formData.hasTopOutputHandle}
            onChange={handleInputChange}
          />
          <label htmlFor="hasTopOutputHandle">Output Handle (top)</label>
        </div>

        <div className="checkbox-container">
          <input
            type="checkbox"
            id="hasBottomOutputHandle"
            name="hasBottomOutputHandle"
            checked={formData.hasBottomOutputHandle}
            onChange={handleInputChange}
          />
          <label htmlFor="hasBottomOutputHandle">Output Handle (bottom)</label>
        </div>

        <div className="checkbox-container">
          <input
            type="checkbox"
            id="hasDoubleTopInputHandle"
            name="hasDoubleTopInputHandle"
            checked={formData.hasDoubleTopInputHandle}
            onChange={handleInputChange}
          />
          <label htmlFor="hasDoubleTopInputHandle">Double Top Input Handle</label>
        </div>

        <div className="checkbox-container">
          <input
            type="checkbox"
            id="hasDoubleBottomInputHandle"
            name="hasDoubleBottomInputHandle"
            checked={formData.hasDoubleBottomInputHandle}
            onChange={handleInputChange}
          />
          <label htmlFor="hasDoubleBottomInputHandle">Double Bottom Input Handle</label>
        </div>

        <div className="checkbox-container">
          <input
            type="checkbox"
            id="hasDoubleBottomOutputHandle"
            name="hasDoubleBottomOutputHandle"
            checked={formData.hasDoubleBottomOutputHandle}
            onChange={handleInputChange}
          />
          <label htmlFor="hasDoubleBottomOutputHandle">Double Bottom Output Handle</label>
        </div>
      </div>
      
      {/* Dimensions */}
      <div className="form-section">
        <h3>Dimensions</h3>
        
        <div className="checkbox-container">
          <input
            type="checkbox"
            id="manualSize"
            name="manualSize"
            checked={formData.manualSize || false}
            onChange={handleInputChange}
          />
          <label htmlFor="manualSize">Manual Size Control</label>
        </div>
        
        <p style={{ fontSize: '0.85rem', color: '#6c757d', marginTop: '0.5rem', marginBottom: '0.75rem' }}>
          Enable to set exact width and height dimensions. When disabled, the node will auto-size based on its content.
        </p>
        
        {formData.manualSize && (
          <>
            <div className="dimensions-controls">
              <div className="form-group">
                <label>Width (px):</label>
                <input
                  type="number"
                  className="form-control"
                  name="width"
                  value={formData.width || 200}
                  onChange={handleInputChange}
                  min="50"
                  max="1000"
                  step="10"
                />
              </div>
              
              <div className="form-group">
                <label>Height (px):</label>
                <input
                  type="number"
                  className="form-control"
                  name="height"
                  value={formData.height || 100}
                  onChange={handleInputChange}
                  min="30"
                  max="800"
                  step="10"
                />
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Styling */}
      <div className="form-section">
        <h3>Styling</h3>
        
        <div className="form-group">
          <label>Background Color:</label>
          <input
            type="color"
            className="color-picker"
            name="bgColor"
            value={formData.bgColor}
            onChange={handleInputChange}
          />
        </div>
        
        <div className="form-group">
          <label>Text Color:</label>
          <input
            type="color"
            className="color-picker"
            name="textColor"
            value={formData.textColor}
            onChange={handleInputChange}
          />
        </div>
      </div>
    </form>
  );
});

// Add display name to the component
NodeEditor.displayName = 'NodeEditor';

export default NodeEditor; 