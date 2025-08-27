import React, { useState, useEffect } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// Draggable item component
const DraggableElementItem = ({ id, index, moveItem, element, elementType }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'element',
    item: { id, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'element',
    hover: (item, monitor) => {
      if (item.index === index) return;
      
      moveItem(item.index, index);
      item.index = index;
    },
  });

  let elementLabel = '';
  let typeLabel = '';
  
  switch (elementType) {
    case 'label':
      typeLabel = 'Label';
      elementLabel = element.text;
      break;
    case 'textBox':
      typeLabel = 'Text Box';
      elementLabel = `"${element.text.substring(0, 20)}${element.text.length > 20 ? '...' : ''}"`;
      break;
    case 'toggle':
      typeLabel = 'Toggle';
      elementLabel = `"${element.text}"`;
      break;
    case 'dropdown':
      typeLabel = 'Dropdown';
      elementLabel = `"${element.label}"`;
      break;
    case 'inputField':
      typeLabel = 'Input Field';
      elementLabel = `"${element.placeholder}"`;
      break;
    default:
      elementLabel = 'Element';
      typeLabel = 'Unknown';
  }

  return (
    <div 
      ref={(node) => drag(drop(node))} 
      className={`draggable-element-item ${isDragging ? 'dragging' : ''}`}
    >
      <div className="drag-handle">
        <span>&#8597;</span>
      </div>
      <div className="element-info">
        <div className="element-type">{typeLabel}</div>
        <div className="element-label">{elementLabel}</div>
      </div>
      {!element.visible && <div className="element-hidden">Hidden</div>}
    </div>
  );
};

// Main component
const ElementReorderPanel = ({ node, updateNodeData, onClose }) => {
  const [orderedElements, setOrderedElements] = useState([]);

  useEffect(() => {
    if (node && node.data && node.data.elements) {
      const allElements = [];
      
      // Handle label (if visible)
      if (node.data.elements.label && node.data.elements.label.visible) {
        allElements.push({
          type: 'label',
          element: node.data.elements.label
        });
      }
      
      // Add all text boxes
      if (node.data.elements.textBoxes) {
        node.data.elements.textBoxes.forEach(textBox => {
          if (textBox.visible) {
            allElements.push({
              type: 'textBox',
              element: textBox
            });
          }
        });
      }
      
      // Add all toggles
      if (node.data.elements.toggles) {
        node.data.elements.toggles.forEach(toggle => {
          if (toggle.visible) {
            allElements.push({
              type: 'toggle',
              element: toggle
            });
          }
        });
      }
      
      // Add all dropdowns
      if (node.data.elements.dropdowns) {
        node.data.elements.dropdowns.forEach(dropdown => {
          if (dropdown.visible) {
            allElements.push({
              type: 'dropdown',
              element: dropdown
            });
          }
        });
      }
      
      // Add all input fields
      if (node.data.elements.inputFields) {
        node.data.elements.inputFields.forEach(inputField => {
          if (inputField.visible) {
            allElements.push({
              type: 'inputField',
              element: inputField
            });
          }
        });
      }
      
      setOrderedElements(allElements);
    }
  }, [node]);

  const moveItem = (fromIndex, toIndex) => {
    const updatedElements = [...orderedElements];
    const [movedItem] = updatedElements.splice(fromIndex, 1);
    updatedElements.splice(toIndex, 0, movedItem);
    
    setOrderedElements(updatedElements);
  };

  const saveChanges = () => {
    if (node && updateNodeData) {
      // Create new arrays for each element type while preserving non-visible elements
      const reorganizedElements = {
        label: node.data.elements.label,
        textBoxes: [...node.data.elements.textBoxes],
        toggles: [...node.data.elements.toggles],
        dropdowns: [...node.data.elements.dropdowns],
        inputFields: [...node.data.elements.inputFields]
      };

      // Create maps to track original indices
      const textBoxIndices = new Map();
      const toggleIndices = new Map();
      const dropdownIndices = new Map();
      const inputFieldIndices = new Map();

      // Map original elements to their indices
      node.data.elements.textBoxes?.forEach((elem, idx) => {
        if (elem.visible) textBoxIndices.set(elem, idx);
      });
      node.data.elements.toggles?.forEach((elem, idx) => {
        if (elem.visible) toggleIndices.set(elem, idx);
      });
      node.data.elements.dropdowns?.forEach((elem, idx) => {
        if (elem.visible) dropdownIndices.set(elem, idx);
      });
      node.data.elements.inputFields?.forEach((elem, idx) => {
        if (elem.visible) inputFieldIndices.set(elem, idx);
      });

      // Process ordered elements and update arrays
      const visibleTextBoxes = [];
      const visibleToggles = [];
      const visibleDropdowns = [];
      const visibleInputFields = [];

      // First, collect visible elements in their new order
      orderedElements.forEach(item => {
        switch (item.type) {
          case 'label':
            reorganizedElements.label = item.element;
            break;
          case 'textBox':
            visibleTextBoxes.push({
              element: item.element,
              originalIndex: textBoxIndices.get(item.element)
            });
            break;
          case 'toggle':
            visibleToggles.push({
              element: item.element,
              originalIndex: toggleIndices.get(item.element)
            });
            break;
          case 'dropdown':
            visibleDropdowns.push({
              element: item.element,
              originalIndex: dropdownIndices.get(item.element)
            });
            break;
          case 'inputField':
            visibleInputFields.push({
              element: item.element,
              originalIndex: inputFieldIndices.get(item.element)
            });
            break;
        }
      });

      // Update arrays with new order while preserving hidden elements
      if (visibleTextBoxes.length > 0) {
        const newTextBoxes = [...reorganizedElements.textBoxes];
        visibleTextBoxes.forEach(({ element, originalIndex }, newIndex) => {
          newTextBoxes[originalIndex] = element;
        });
        reorganizedElements.textBoxes = newTextBoxes;
      }

      if (visibleToggles.length > 0) {
        const newToggles = [...reorganizedElements.toggles];
        visibleToggles.forEach(({ element, originalIndex }, newIndex) => {
          newToggles[originalIndex] = element;
        });
        reorganizedElements.toggles = newToggles;
      }

      if (visibleDropdowns.length > 0) {
        const newDropdowns = [...reorganizedElements.dropdowns];
        visibleDropdowns.forEach(({ element, originalIndex }, newIndex) => {
          newDropdowns[originalIndex] = element;
        });
        reorganizedElements.dropdowns = newDropdowns;
      }

      if (visibleInputFields.length > 0) {
        const newInputFields = [...reorganizedElements.inputFields];
        visibleInputFields.forEach(({ element, originalIndex }, newIndex) => {
          newInputFields[originalIndex] = element;
        });
        reorganizedElements.inputFields = newInputFields;
      }

      // Update the node with reorganized elements
      updateNodeData(node.id, {
        ...node.data,
        elements: reorganizedElements
      });
      
      onClose();
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="element-reorder-panel">
        <p className="instruction">Drag and drop elements to reorder them. The order here will match the order on the node.</p>
        
        <div className="unified-element-list">
          {orderedElements.length > 0 ? (
            orderedElements.map((item, index) => (
              <DraggableElementItem
                key={`element-${index}`}
                id={`element-${index}`}
                index={index}
                element={item.element}
                elementType={item.type}
                moveItem={moveItem}
              />
            ))
          ) : (
            <div className="empty-list">No visible elements to reorder</div>
          )}
        </div>
        
        <div className="buttons-container">
          <button 
            type="button" 
            className="button button-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            type="button" 
            className="button button-primary"
            onClick={saveChanges}
          >
            Save Order
          </button>
        </div>
      </div>
    </DndProvider>
  );
};

export default ElementReorderPanel; 