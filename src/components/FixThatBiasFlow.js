import { useMemo } from 'react';

const FixThatBiasFlow = ({ caseStudy, selectedNodeId, incorrectSelectionId, onSelectionChange }) => {
  const nodes = useMemo(() => 
    caseStudy.steps.map(step => ({
      ...step,
      selected: step.id === selectedNodeId,
      className: step.id === incorrectSelectionId ? 'incorrect-selection' : '',
    })),
    [caseStudy.steps, selectedNodeId, incorrectSelectionId]
  );

  // ... rest of the component ...
}; 