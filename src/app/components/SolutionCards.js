import React, { useState } from 'react';

export default function SolutionCards({ 
  solutionCards, 
  onSolutionSelect, 
  disabledCards = [], 
  selectedCard = null 
}) {
  const [draggedCard, setDraggedCard] = useState(null);

  const handleCardClick = (cardId) => {
    if (disabledCards.includes(cardId)) return;
    onSolutionSelect(cardId);
  };

  const handleDragStart = (e, cardId) => {
    if (disabledCards.includes(cardId)) {
      e.preventDefault();
      return;
    }
    setDraggedCard(cardId);
    e.dataTransfer.setData('text/plain', cardId);
  };

  const handleDragEnd = () => {
    setDraggedCard(null);
  };

  const getCardStyle = (card) => {
    const isDisabled = disabledCards.includes(card.id);
    const isSelected = selectedCard === card.id;
    const isDragging = draggedCard === card.id;
    
    let backgroundColor = '#ffffff';
    let borderColor = '#d1d5db';
    let opacity = 1;
    
    if (isDisabled) {
      backgroundColor = '#fef2f2';
      borderColor = '#ef4444';
      opacity = 0.6;
    } else if (isSelected) {
      backgroundColor = '#ecfdf5';
      borderColor = '#10b981';
    } else if (isDragging) {
      backgroundColor = '#f3f4f6';
      borderColor = '#6b7280';
      opacity = 0.8;
    }

    return {
      padding: '16px',
      margin: '8px',
      border: `2px solid ${borderColor}`,
      borderRadius: '8px',
      backgroundColor,
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      opacity,
      transition: 'all 0.3s ease',
      boxShadow: isDragging ? '0 8px 24px rgba(0, 0, 0, 0.15)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
      transform: isDragging ? 'scale(1.02)' : 'scale(1)',
      userSelect: 'none',
      minHeight: '80px',
      display: 'flex',
      alignItems: 'center',
    };
  };

  if (!solutionCards || solutionCards.length === 0) {
    return null;
  }

  return (
    <div style={{ 
      padding: '20px',
      backgroundColor: '#f9fafb',
      borderRadius: '12px',
      border: '1px solid #e5e7eb'
    }}>
      <h3 style={{ 
        margin: '0 0 16px 0', 
        fontSize: '18px', 
        fontWeight: '600',
        color: '#374151'
      }}>
        Solution Options
      </h3>
      <p style={{ 
        margin: '0 0 20px 0', 
        fontSize: '14px', 
        color: '#6b7280'
      }}>
        Click or drag a solution card to apply it to the identified problem step.
      </p>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '8px' 
      }}>
        {solutionCards.map((card) => (
          <div
            key={card.id}
            style={getCardStyle(card)}
            onClick={() => handleCardClick(card.id)}
            draggable={!disabledCards.includes(card.id)}
            onDragStart={(e) => handleDragStart(e, card.id)}
            onDragEnd={handleDragEnd}
          >
            <div style={{ 
              fontSize: '14px', 
              lineHeight: '1.5',
              color: disabledCards.includes(card.id) ? '#6b7280' : '#374151',
              fontWeight: selectedCard === card.id ? '600' : '400'
            }}>
              {card.text}
            </div>
            
            {disabledCards.includes(card.id) && (
              <div style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                width: '20px',
                height: '20px',
                backgroundColor: '#ef4444',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                ✕
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 