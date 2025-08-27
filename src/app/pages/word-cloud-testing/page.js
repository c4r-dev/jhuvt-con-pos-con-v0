/*
word cloud page

I'd like to add a feature to this application 

Application so far:

So far on the Activity-1 page, users will viewing a react-flow powered flowchart and will be adding comments to the nodes. In the context of the application, the users are researchers in training. The flowchart will be pre-built, such that each node represents a phase or action of a research study. 

The users are tasked with identifying concerns that pertain to parts of the study, in the form of leaving comments. The users will select one or many nodes in a dropdown and then select a type of concern from the dropdown and also type a comment that identifies this concern. They will then submit these comments so that they appear in a table at the bottom of the page.

This is all functioning as desired so far.


Next steps:

Adding new feature: Utilize LLM to group similar submissions and assign these groups 1-2 word thematic names

I'd like to add a feature to this application that will be utilized on the next page we're building. 
I need to process some data that will later be used to generate a visual word cloud based on data collected in these concern-comments.
We are NOT going to build the word cloud just yet. 
We need to first process the submitted comment data from the Activity-1 in such a way so we can make a useful data set for the word cloud.

Technical outline
- Add a new page with a dropdown. Allowing me to select a given flowchart from the database. 
- Upon selection of a given flowchart, we will fetch all of the comments from the database for this flowchart.
- We will then pass this data to the OpenAI API to process the data and group similar submissions.


The LLM will be tasked with the following:
  - Read through all of the comments for a given flowchart, noting the node that the comment is associated with, the type of concern, and the comment text.
  - Group similar submissions into thematic groups and assign these groups 1-2 word names
  - Return each of the comments in the same format as before, but organized into distinct groups, each with a 1-2 word name.
  - It is essential that the LLM does not change the content of the comments, only group them into distinct thematic groups and assign these groups 1-2 word names.
  - There may be many comments or very few comments. Regardless, you should strive to create between 3 and 15 groups. (Assuming there are at least 3 comments)
  - The LLM should return the data in a format that can be easily parsed by the application.
  - The format of the data should be very conistent and predictable, so that the application can parse it correctly.


Now:
- Please create the page with the dropdown and the functionality to select a given flowchart.
- Please create the functionality to fetch the comments from the database for the selected flowchart.
- Please create the functionality to pass the data to the LLM to process the data and group similar submissions.
- Please write a prompt for the LLM to accomplish the task outlined above.
- Please create the functionality to display the processed data in a table before we attempt to create the word cloud.

*/

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getFlowsFromDatabase } from '../designer/utils/flowUtils';
import { getCommentsForFlow } from '../flow-viewer/utils/commentUtils';
import './word-cloud-testing.css';

export default function WordCloudPage() {
  const [savedFlows, setSavedFlows] = useState([]);
  const [selectedFlow, setSelectedFlow] = useState(null);
  const [selectedFlowInfo, setSelectedFlowInfo] = useState(null);
  const [concerns, setConcerns] = useState([]);
  const [themedConcerns, setThemedConcerns] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [concernsLoading, setConcernsLoading] = useState(false);
  const [processingConcerns, setProcessingConcerns] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();

  // Format date for display
  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Load flows from database on component mount
  useEffect(() => {
    const loadSavedFlows = async () => {
      setIsLoading(true);
      
      // Get database flows only
      let dbFlows = [];
      try {
        dbFlows = await getFlowsFromDatabase();
        setSavedFlows(dbFlows);
      } catch (error) {
        console.error('Error loading database flows:', error);
        setErrorMessage('Failed to load flowcharts. Please try again.');
      }
      
      setIsLoading(false);
    };
    
    loadSavedFlows();
  }, []);

  // Handle flow selection
  const handleFlowSelection = async (e) => {
    const flowId = e.target.value;
    
    // Reset states
    setSelectedFlow(flowId);
    setThemedConcerns(null);
    setErrorMessage('');
    
    if (!flowId) {
      setSelectedFlowInfo(null);
      setConcerns([]);
      return;
    }

    const selectedFlowData = savedFlows.find(flow => flow.id === flowId);
    
    if (selectedFlowData) {
      setSelectedFlowInfo({
        name: selectedFlowData.name,
        description: selectedFlowData.description,
        nodeCount: selectedFlowData.nodeCount,
        edgeCount: selectedFlowData.edgeCount,
        created: selectedFlowData.timestamp
      });
      
      // Load comments for the selected flow
      await loadConcernsForFlow(flowId);
    }
  };

  // Load concerns from database
  const loadConcernsForFlow = async (flowId) => {
    setConcernsLoading(true);
    try {
      const result = await getCommentsForFlow(flowId);
      if (result.success) {
        setConcerns(result.data);
      } else {
        setConcerns([]);
        setErrorMessage('Failed to load concerns. Please try again.');
      }
    } catch (error) {
      console.error('Error loading concerns:', error);
      setConcerns([]);
      setErrorMessage('Failed to load concerns. Please try again.');
    } finally {
      setConcernsLoading(false);
    }
  };

  // Process concerns with OpenAI
  const processConcerns = async () => {
    if (concerns.length === 0) {
      setErrorMessage('No concerns to process.');
      return;
    }

    setProcessingConcerns(true);
    setErrorMessage('');
    
    try {
      // Prepare optimized payload with only essential data
      const optimizedConcerns = concerns.map(concern => ({
        id: concern._id,
        text: concern.text,
        commentType: concern.commentType,
        nodeLabels: concern.nodeLabels
      }));

      const response = await fetch('/api/openAI', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          comments: optimizedConcerns,
          flowId: selectedFlow 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error: ${response.status}`);
      }

      const data = await response.json();
      setThemedConcerns(data);
    } catch (error) {
      console.error('Error processing concerns:', error);
      setErrorMessage('Failed to process concerns. Please try again.');
    } finally {
      setProcessingConcerns(false);
    }
  };

  // Navigate to designer
  const goToDesigner = () => {
    router.push('/pages/designer');
  };

  // Get concern type label
  const getConcernTypeLabel = (type) => {
    const typeMap = {
      'confound': 'CONFOUND',
      'bias': 'BIAS',
      'not_sure': 'NOT SURE',
      'other': 'OTHER'
    };
    return typeMap[type] || type.toUpperCase();
  };

  // Get affected nodes text
  const getAffectedNodesText = (nodeLabels) => {
    if (!nodeLabels || nodeLabels.length === 0) return '';
    
    if (nodeLabels.length <= 3) {
      return nodeLabels.join(', ');
    } else {
      return `${nodeLabels.slice(0, 3).join(', ')} and ${nodeLabels.length - 3} more`;
    }
  };

  return (
    <div className="word-cloud-page">
      <div className="page-header">
        <h1>Word Cloud Preprocessing</h1>
        <div className="flow-selection">
          <select 
            value={selectedFlow || ''} 
            onChange={handleFlowSelection}
            className="flow-select"
          >
            <option value="">Select a flow to process</option>
            {savedFlows.map((flow) => (
              <option key={flow.id} value={flow.id}>
                {flow.name} ({flow.nodeCount} nodes, {flow.edgeCount} edges)
              </option>
            ))}
          </select>
          <button className="button button-primary" onClick={goToDesigner}>
            Open Designer
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>Loading flows...</p>
        </div>
      )}

      {errorMessage && (
        <div className="error-message">
          {errorMessage}
        </div>
      )}

      {selectedFlowInfo && (
        <div className="selected-flow-info">
          <h2>{selectedFlowInfo.name}</h2>
          <div className="flow-date">Created: {formatDate(selectedFlowInfo.created)}</div>
          {selectedFlowInfo.description && (
            <p className="flow-description">{selectedFlowInfo.description}</p>
          )}
        </div>
      )}

      {selectedFlow && concerns.length > 0 && (
        <div className="concerns-section">
          <div className="section-header">
            <h2>Concerns ({concerns.length})</h2>
            <button 
              className="button button-primary" 
              onClick={processConcerns}
              disabled={processingConcerns}
            >
              {processingConcerns ? 'Processing...' : 'Process Concerns for Word Cloud'}
            </button>
          </div>

          {concernsLoading ? (
            <div className="loading-indicator">
              <div className="spinner"></div>
              <p>Loading concerns...</p>
            </div>
          ) : (
            <div className="concerns-table-container">
              <table className="concerns-table">
                <thead>
                  <tr>
                    <th className="concern-col">CONCERN</th>
                    <th className="type-col">TYPE</th>
                    <th className="processes-col">PROCESSES AFFECTED</th>
                  </tr>
                </thead>
                <tbody>
                  {concerns.map(concern => (
                    <tr 
                      key={concern._id}
                      className={`concern-row concern-type-${concern.commentType}`}
                    >
                      <td className="concern-col">{concern.text}</td>
                      <td className="type-col">{getConcernTypeLabel(concern.commentType)}</td>
                      <td className="processes-col">{getAffectedNodesText(concern.nodeLabels)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {selectedFlow && concerns.length === 0 && !concernsLoading && (
        <div className="no-concerns">
          <p>No concerns found for this flowchart. Please go back to Activity 1 and add some concerns.</p>
        </div>
      )}

      {themedConcerns && themedConcerns.themes && (
        <div className="themed-concerns-section">
          <h2>Processed Themes</h2>
          
          <div className="themes-grid">
            {themedConcerns.themes.map((theme, index) => (
              <div key={index} className="theme-card">
                <h3 className="theme-name">{theme.name}</h3>
                <p className="theme-count">{theme.concerns.length} concerns</p>
                
                <div className="theme-concerns">
                  <table className="theme-concerns-table">
                    <thead>
                      <tr>
                        <th>Concern</th>
                        <th>Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {theme.concerns.map((concern, concernIndex) => (
                        <tr key={concernIndex}>
                          <td>{concern.text}</td>
                          <td>{getConcernTypeLabel(concern.commentType)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
          
          <div className="theme-summary">
            <h3>Theme Summary</h3>
            <div className="theme-summary-content">
              <div className="theme-distribution">
                {themedConcerns.themes.map((theme, index) => (
                  <div key={index} className="theme-item">
                    <span className="theme-name">{theme.name}</span>
                    <span className="theme-count">{theme.concerns.length}</span>
                    <div 
                      className="theme-bar" 
                      style={{ 
                        width: `${(theme.concerns.length / concerns.length) * 100}%`,
                        backgroundColor: `hsl(${index * (360 / themedConcerns.themes.length)}, 70%, 60%)`
                      }}
                    ></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}